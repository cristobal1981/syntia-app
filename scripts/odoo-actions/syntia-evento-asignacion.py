# Acción de servidor de Odoo (Ejecutar código) sobre project.task y helpdesk.ticket:
# avisa a Syntia de un cambio de responsable. NO se ejecuta aquí: es la copia
# versionada del código que vive en Odoo. Va en dos reglas de automatización con
# la misma acción (una acción de servidor está ligada a un modelo: se duplica una
# por modelo con este mismo código):
#   - «Syntia eventos: cambio de responsable (tarea)»: on_write sobre Tarea,
#     campo disparador `user_ids`.
#   - «Syntia eventos: cambio de responsable (ticket)»: on_write sobre Ticket de
#     ayuda, campo disparador `user_id`.
# Mismos parámetros del sistema que syntia-evento-tarea.py.
# Manda los nombres de quienes lo llevan AHORA; si no queda nadie no envía nada
# (quitar la asignación no es un aviso). Syntia ignora las obligaciones.
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
prefix = icp.get_param('syntia.obligaciones_prefix') or 'Obligaciones Fiscales'
# Con la URL de pruebas activa solo se envían los eventos del proyecto de pruebas (277) y de los tickets del cliente 1233.
TEST_PROJECT_ID = 277
TEST_PARTNER_ID = 1233
rec = record.sudo()
is_task = rec._name == 'project.task'
users = rec.user_ids if is_task else rec.user_id
names = [user.name for user in users if user.name]
if url and secret and names:
    ancestors = []
    visible = True
    if is_task:
        parent = rec.parent_id
        for _i in range(10):
            if not parent:
                break
            ancestors.insert(0, parent.name or '')
            parent = parent.parent_id
        root_name = ancestors[0] if ancestors else (rec.name or '')
        # Visible en Syntia: árbol de obligaciones, o la tarea o un ancestro con el flag.
        visible = root_name.startswith(prefix)
        cursor = rec
        for _i in range(11):
            if visible or not cursor:
                break
            if cursor.x_studio_mostrar_en_syntia:
                visible = True
            cursor = cursor.parent_id
        partner = rec.project_id.partner_id or rec.partner_id
        in_scope = (not test_url) or rec.project_id.id == TEST_PROJECT_ID
    else:
        partner = rec.partner_id
        in_scope = (not test_url) or (partner and partner.id == TEST_PARTNER_ID)
    if visible and partner and in_scope:
        stamp = rec.write_date or rec.create_date
        occurred = stamp.strftime('%Y-%m-%dT%H:%M:%SZ')
        payload = {
            # Con los responsables y la hora en el id, volver a un responsable anterior sí es un aviso nuevo.
            'event_id': 'assign:%s:%s:%s:%s' % ('task' if is_task else 'ticket', rec.id, ','.join(str(i) for i in sorted(users.ids)), occurred),
            'model': rec._name,
            'kind': 'assignee_change',
            'record_id': rec.id,
            'record_name': rec.name or '',
            'ancestor_names': ancestors,
            'partner_id': partner.id,
            'assignee_names': names,
            'occurred_at': occurred,
        }
        headers = {'Authorization': 'Bearer ' + secret}
        if test_url and bypass:
            headers['x-vercel-protection-bypass'] = bypass
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=5)
            if r.status_code >= 400:
                rec.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
        except Exception as e:
            rec.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
