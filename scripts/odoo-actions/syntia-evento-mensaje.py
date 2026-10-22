# Acción de servidor de Odoo (Ejecutar código) sobre mail.message: avisa a
# Syntia de un mensaje nuevo en una tarea o un ticket. NO se ejecuta aquí: es la
# copia versionada del código que vive en Odoo.
# Regla «Syntia eventos: mensaje nuevo»: on_create sobre Message, con el dominio
#   [('model', 'in', ['project.task', 'helpdesk.ticket']), ('message_type', '=', 'comment')]
# Mismos parámetros del sistema que syntia-evento-tarea.py.
icp = env['ir.config_parameter'].sudo()
url = icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
prefix = icp.get_param('syntia.obligaciones_prefix') or 'Obligaciones Fiscales'
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
        if visible and partner:
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
            try:
                r = requests.post(url, json=payload, headers={'Authorization': 'Bearer ' + secret}, timeout=5)
                if r.status_code >= 400:
                    target.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
            except Exception as e:
                target.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
