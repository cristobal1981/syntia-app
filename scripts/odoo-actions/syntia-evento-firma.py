# Acción de servidor de Odoo (Ejecutar código) sobre sign.request.item: avisa a
# Syntia de una firma nueva pendiente para un firmante. NO se ejecuta aquí: es la
# copia versionada del código que vive en Odoo.
# Regla «Syntia eventos: firma nueva»: on_create sobre «Elemento de solicitud de firma»
# (sign.request.item), sin dominio. Un item es un firmante de una solicitud, así que
# hay un evento por cliente que debe firmar. Syntia lo recibe como model = sign.request.
# Mismos parámetros del sistema que syntia-evento-tarea.py.
# Odoo manda hechos en bruto; Syntia decide ámbito y título
# (ver src/modules/push/domain/portal-event.ts).
icp = env['ir.config_parameter'].sudo()
# Mientras `syntia.odoo_events_url_tests` tenga valor, los eventos van a esa URL (p. ej. una
# preview de Vercel, con `syntia.vercel_protection_bypass`); vaciarlo vuelve a la URL real.
test_url = icp.get_param('syntia.odoo_events_url_tests')
url = test_url or icp.get_param('syntia.odoo_events_url')
secret = icp.get_param('syntia.odoo_events_secret')
bypass = icp.get_param('syntia.vercel_protection_bypass')
# Con la URL de pruebas activa solo se envían las firmas del cliente 1233.
TEST_PARTNER_ID = 1233
item = record.sudo()
partner = item.partner_id
sign_request = item.sign_request_id
if url and secret and partner and sign_request and ((not test_url) or partner.id == TEST_PARTNER_ID):
    stamp = item.create_date
    occurred = stamp.strftime('%Y-%m-%dT%H:%M:%SZ')
    payload = {
        # Con el firmante en el id, dos firmantes de la misma solicitud no se pisan.
        'event_id': 'firma-new:%s:%s' % (sign_request.id, partner.id),
        'model': 'sign.request',
        'kind': 'new_firma',
        'record_id': sign_request.id,
        'record_name': sign_request.reference or sign_request.display_name or '',
        'partner_id': partner.id,
        'occurred_at': occurred,
    }
    headers = {'Authorization': 'Bearer ' + secret}
    if test_url and bypass:
        headers['x-vercel-protection-bypass'] = bypass
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=5)
        if r.status_code >= 400:
            sign_request.message_post(body='⚠️ Eventos Syntia respondió %s: %s' % (r.status_code, r.text[:300]), subtype_xmlid='mail.mt_note', author_id=1260)
    except Exception as e:
        sign_request.message_post(body='⚠️ Error al enviar el evento a Syntia: %s' % e, subtype_xmlid='mail.mt_note', author_id=1260)
