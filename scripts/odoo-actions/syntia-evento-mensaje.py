# Acción de servidor de Odoo (Ejecutar código) sobre mail.message: avisa a
# Syntia de un mensaje nuevo en una tarea o un ticket. NO se ejecuta aquí: es la
# copia versionada del código que vive en Odoo.
# Regla «Syntia eventos: mensaje nuevo»: on_create sobre Message, con el dominio
#   [('model', 'in', ['project.task', 'helpdesk.ticket']), ('message_type', '=', 'comment')]
# Mismos parámetros del sistema que syntia-evento-tarea.py.
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
prefix = icp.get_param('syntia.obligaciones_prefix') or 'Obligaciones Fiscales'
# Con la URL de pruebas activa solo se envían los eventos del proyecto de pruebas (proyecto 277) y los tickets del cliente 1233.
TEST_PROJECT_ID = 277
TEST_PARTNER_ID = 1233
msg = record.sudo()
if url and secret and msg.model in ('project.task', 'helpdesk.ticket') and msg.res_id and msg.message_type == 'comment' and not msg.subtype_id.internal:
    target = env[msg.model].sudo().browse(msg.res_id).exists()
    if target:
        ancestors = []
        visible = True
        if msg.model == 'project.task':
            parent = target.parent_id
            for _i in range(10):
                if not parent:
                    break
                ancestors.insert(0, parent.name or '')
                parent = parent.parent_id
            root_name = ancestors[0] if ancestors else (target.name or '')
            visible = root_name.startswith(prefix)
            cursor = target
            for _i in range(11):
                if visible or not cursor:
                    break
                if cursor.x_studio_mostrar_en_syntia:
                    visible = True
                cursor = cursor.parent_id
            partner = target.project_id.partner_id or target.partner_id
        else:
            partner = target.partner_id
        if msg.model == 'project.task':
            in_scope = (not test_url) or target.project_id.id == TEST_PROJECT_ID
        else:
            in_scope = (not test_url) or (partner and partner.id == TEST_PARTNER_ID)
        if visible and partner and in_scope:
            payload = {
                'event_id': 'msg:%s' % msg.id,
                'model': msg.model,
                'kind': 'message',
                'record_id': target.id,
                'record_name': target.name or '',
                'ancestor_names': ancestors,
                'partner_id': partner.id,
                'message_id': msg.id,
                'message_body': msg.body or '',
                # Los mensajes del portal se publican con el cliente como autor.
                'by_client': bool(msg.author_id) and msg.author_id.id == partner.id,
                'occurred_at': msg.date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            }
            headers = {'Authorization': 'Bearer ' + secret}
            if test_url and bypass:
                headers['x-vercel-protection-bypass'] = bypass
            try:
                r = requests.post(url, json=payload, headers=headers, timeout=5)
                if r.status_code >= 400:
                    target.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
            except Exception as e:
                target.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
