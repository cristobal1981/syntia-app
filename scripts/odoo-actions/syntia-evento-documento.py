# Acción de servidor de Odoo (Ejecutar código) sobre ir.attachment: avisa a Syntia
# de documentos nuevos en una tarea o un ticket. NO se ejecuta aquí: es la copia
# versionada del código que vive en Odoo.
# Regla «Syntia eventos: documento nuevo»: on_create_or_write sobre Adjunto, campo
# disparador `res_id` (los archivos subidos desde el editor de mensajes nacen sin
# registro y se asignan al publicar), con el dominio
#   [('res_model', 'in', ['project.task', 'helpdesk.ticket']), ('res_id', '>', 0)]
# Mismos parámetros del sistema que syntia-evento-tarea.py.
# NO avisa de:
#   - lo que crea OdooBot (automatizaciones: modelos generados, adjuntos de correo…);
#   - lo que sube el propio cliente: desde Syntia (marca `syntia:cliente` en la
#     descripción, ver src/modules/portal/domain/client-attachment-mark.ts) o
#     directamente en Odoo (el creador es un contacto del cliente).
# Un evento por archivo (id `doc:<adjunto>`, idempotente); Syntia agrupa los de un
# mismo registro en un solo aviso («3 documentos nuevos en …»).
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
prefix = icp.get_param('syntia.obligaciones_prefix') or 'Obligaciones Fiscales'
# Con la URL de pruebas activa solo se envían los documentos del proyecto de pruebas (277) y de los tickets del cliente 1233.
TEST_PROJECT_ID = 277
TEST_PARTNER_ID = 1233
CLIENT_MARK = 'syntia:cliente'
ODOOBOT_USER_ID = 1
att = record.sudo()
if url and secret and att.res_model in ('project.task', 'helpdesk.ticket') and att.res_id and att.create_uid.id != ODOOBOT_USER_ID and (att.description or '') != CLIENT_MARK:
    target = env[att.res_model].sudo().browse(att.res_id).exists()
    if target:
        ancestors = []
        visible = True
        if att.res_model == 'project.task':
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
            in_scope = (not test_url) or target.project_id.id == TEST_PROJECT_ID
        else:
            partner = target.partner_id
            in_scope = (not test_url) or (partner and partner.id == TEST_PARTNER_ID)
        uploaded_by_client = bool(partner) and att.create_uid.partner_id.id == partner.id
        if visible and partner and in_scope and not uploaded_by_client:
            stamp = att.write_date or att.create_date
            payload = {
                'event_id': 'doc:%s' % att.id,
                'model': att.res_model,
                'kind': 'new_document',
                'record_id': target.id,
                'record_name': target.name or '',
                'ancestor_names': ancestors,
                'partner_id': partner.id,
                'occurred_at': stamp.strftime('%Y-%m-%dT%H:%M:%SZ'),
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
