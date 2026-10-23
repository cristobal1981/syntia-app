# Acción de servidor de Odoo (Ejecutar código) sobre helpdesk.ticket: avisa a
# Syntia de una consulta nueva. NO se ejecuta aquí: es la copia versionada del
# código que vive en Odoo.
# Regla «Syntia eventos: ticket nuevo»: on_create sobre Ticket de ayuda, sin dominio.
# Mismos parámetros del sistema que syntia-evento-tarea.py.
# Syntia crea los tickets con el mismo usuario de Odoo que usa el equipo, así que el
# creador no distingue «creado desde Syntia» de «creado a mano»: by_client solo es true
# si lo creó el propio cliente (su contacto). Un ticket abierto desde Syntia avisa al
# cliente de su propia consulta.
# Odoo manda hechos en bruto; Syntia decide ámbito y título
# (ver src/modules/push/domain/portal-event.ts).
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
# Con la URL de pruebas activa solo se envían los tickets del cliente 1233.
TEST_PARTNER_ID = 1233
ticket = record.sudo()
partner = ticket.partner_id
if url and secret and partner and ((not test_url) or partner.id == TEST_PARTNER_ID):
    stamp = ticket.create_date
    occurred = stamp.strftime('%Y-%m-%dT%H:%M:%SZ')
    creator = ticket.create_uid
    by_client = bool(creator) and creator.partner_id.id == partner.id
    payload = {
        'event_id': 'ticket-new:%s' % ticket.id,
        'model': 'helpdesk.ticket',
        'kind': 'new_record',
        'record_id': ticket.id,
        'record_name': ticket.name or '',
        'partner_id': partner.id,
        'by_client': by_client,
        'occurred_at': occurred,
    }
    headers = {'Authorization': 'Bearer ' + secret}
    if test_url and bypass:
        headers['x-vercel-protection-bypass'] = bypass
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=5)
        if r.status_code >= 400:
            ticket.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
    except Exception as e:
        ticket.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
