# Acción de servidor de Odoo (Ejecutar código) sobre project.task: avisa a Syntia
# de un cambio de estado o de una tarea nueva. NO se ejecuta aquí: es la copia
# versionada del código que vive en Odoo. Va en dos reglas de automatización:
#   - «Syntia eventos: cambio de estado de tarea»: on_write, campo disparador `state`,
#     con KIND = 'status'.
#   - «Syntia eventos: tarea nueva»: on_create_or_write, campo disparador
#     `x_studio_mostrar_en_syntia` (una tarea es «nueva» para el cliente cuando se
#     marca como visible, no cuando se crea), con KIND = 'new_record'.
# Parámetros del sistema (Ajustes > Técnico > Parámetros del sistema):
#   syntia.odoo_events_url      https://app.syntia.es/api/webhooks/odoo-events
#   syntia.odoo_events_secret   el valor de ODOO_EVENTS_SECRET en Vercel
#   syntia.obligaciones_prefix  (opcional) «Obligaciones Fiscales»
#   syntia.odoo_events_url_tests, syntia.vercel_protection_bypass  (solo para pruebas contra una preview)
# Odoo manda hechos en bruto; Syntia decide ámbito, título y estado visible
# (ver src/modules/push/domain/portal-event.ts).
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
prefix = icp.get_param('syntia.obligaciones_prefix') or 'Obligaciones Fiscales'
# Con la URL de pruebas activa solo se envían los eventos del proyecto de pruebas (cliente 1233, proyecto 277).
TEST_PROJECT_ID = 277
KIND = 'status'  # o 'new_record'
task = record.sudo()
if url and secret:
    ancestors = []
    parent = task.parent_id
    for _i in range(10):
        if not parent:
            break
        ancestors.insert(0, parent.name or '')
        parent = parent.parent_id
    root_name = ancestors[0] if ancestors else (task.name or '')
    # Visible en Syntia: árbol de obligaciones, o la tarea o un ancestro con el flag.
    visible = root_name.startswith(prefix)
    cursor = task
    for _i in range(11):
        if visible or not cursor:
            break
        if cursor.x_studio_mostrar_en_syntia:
            visible = True
        cursor = cursor.parent_id
    partner = task.project_id.partner_id or task.partner_id
    in_scope = (not test_url) or task.project_id.id == TEST_PROJECT_ID
    if visible and partner and in_scope:
        previous_state = ''
        try:
            previous_state = old_values[task.id]['state'] or ''
        except Exception:
            previous_state = ''
        stamp = task.write_date or task.create_date
        occurred = stamp.strftime('%Y-%m-%dT%H:%M:%SZ')
        if KIND == 'status':
            # Con el estado en el id, dos cambios en el mismo segundo no se pisan.
            event_id = 'task-state:%s:%s:%s' % (task.id, task.state, occurred)
        else:
            event_id = 'task-new:%s' % task.id
        payload = {
            'event_id': event_id,
            'model': 'project.task',
            'kind': KIND,
            'record_id': task.id,
            'record_name': task.name or '',
            'ancestor_names': ancestors,
            'partner_id': partner.id,
            'state': task.state or '',
            'previous_state': previous_state,
            'occurred_at': occurred,
        }
        headers = {'Authorization': 'Bearer ' + secret}
        if test_url and bypass:
            headers['x-vercel-protection-bypass'] = bypass
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=5)
            if r.status_code >= 400:
                task.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
        except Exception as e:
            task.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
