# Onboarding form access tokens

## Objetivo

Permitir formularios privados de onboarding en la landing sin login del cliente.
El acceso se controla con tokens de un solo uso guardados en Supabase.

## Flujo v1 (alta autonomo)

1. Asesor/admin genera enlace desde ficha de cliente en Syntia.
2. Se revocan tokens activos previos del mismo cliente (por email y/o `odoo_partner_id`).
3. Landing valida token con `GET /api/onboarding/alta-autonomo/validate`.
4. Landing envia formulario con `POST /api/onboarding/alta-autonomo/submit`.
5. Syntia crea registro en Odoo (`x_solicitud_alta_autonomo`) y marca `used_at`.

## Seguridad

- Header obligatorio: `X-Landing-Onboarding-Secret`.
- Secret en servidor: `LANDING_ONBOARDING_API_SECRET`.
- Tabla con RLS habilitado y sin acceso para `anon`/`authenticated`.
- Un token activo por `form_kind` + (`odoo_partner_id` o `recipient_email`).

## Deploy preview (Vercel)

La landing valida el token en servidor llamando a syntia (`SYNTIA_APP_URL`).

Checklist:

1. En **landing** y **syntia**, define `LANDING_ONBOARDING_API_SECRET` con el mismo valor en el entorno **Preview** (no solo Production).
2. En **landing** Preview, `SYNTIA_APP_URL` debe apuntar al deploy de syntia accesible (URL `*.vercel.app` del proyecto syntia, sin `/` final).
3. Si syntia Preview tiene **Deployment Protection**, genera un bypass en syntia (Settings → Deployment Protection → Protection Bypass for Automation) y cópialo en landing como `SYNTIA_VERCEL_PROTECTION_BYPASS`. Sin esto, la landing recibe respuestas vacías (p. ej. 204) y muestra «No podemos validar el enlace ahora mismo».
4. En **syntia** Preview deben existir `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` y credenciales Odoo (`ODOO_URL`, `ODOO_API_KEY`) para validar tokens y devolver el catálogo de países/provincias.
5. El token debe existir en la misma base Supabase a la que apunta el deploy de syntia usado por `SYNTIA_APP_URL`.
6. En syntia, `NEXT_PUBLIC_LANDING_URL` debe ser la URL preview de la landing para generar enlaces correctos.

## Notas operativas

- Caducidad por defecto: 14 dias (`expires_at`).
- Estados invalidos esperados por la landing: `expired`, `used`, `revoked`, `not_found`.
- Al generar el enlace, Syntia envía el correo branded al cliente (Resend) con CTA, caducidad y aviso de formulario único.

## Flujo v2: Odoo → Syntia directo (sin pasar por la UI)

Permite crear una solicitud desde una automatización en Odoo sobre un `crm.lead` (que debe
llegar ya con `partner_id` vinculado), sin que un asesor la genere manualmente. Syntia solo entra
para la trazabilidad del envío.

- Endpoint: `POST https://app.syntia.es/api/odoo/solicitudes`
- Header obligatorio: `X-Odoo-Solicitud-Secret` = `ODOO_SOLICITUD_WEBHOOK_SECRET`.
- Body JSON esperado (acepta nombres de campo técnicos de `crm.lead` directamente):
  ```json
  { "email": "...", "email_from": "...", "name": "...", "contact_name": "...", "partner_id": 123 }
  ```
  Solo hacen falta un email (`email` o `email_from`) y `partner_id` (número, o tupla `[id, label]`
  si se manda tal cual la devuelve el ORM de Odoo). `name`/`contact_name`/`partner_name` es
  opcional (si falta, se usa el email como nombre).
- Respuesta minimal: `{ "ok": true }` o `{ "ok": false, "error": "..." }` — nunca se devuelve el
  token, la URL de acceso privada ni el `odoo_partner_id`.
- Reutiliza exactamente la misma lógica de creación que la UI
  (`createAltaAutonomoAccessLinkCore` en `onboarding-solicitudes-actions.ts`): si ese
  `partner_id`/email ya corresponde a un cliente existente en el portal, usa su email/nombre
  actuales de Supabase en vez de los que traiga el payload.
- **Importante sobre el trigger en Odoo**: cada llamada revoca la solicitud activa anterior (si
  la hay) para ese contacto y crea una nueva, reenviando el correo. La automatización debe
  disparar sobre una condición precisa (p. ej. "al cambiar a esta etapa concreta"), no en cada
  guardado del lead, o el cliente recibirá el correo repetidas veces.
- Ejemplo de automatización en Odoo (acción "Ejecutar código Python" sobre un método del modelo,
  no el snippet limitado de Studio, que no permite `import requests`):
  ```python
  import requests
  payload = {
      "email": record.email_from,
      "name": record.contact_name or record.partner_name,
      "partner_id": record.partner_id.id,
  }
  requests.post(
      "https://app.syntia.es/api/odoo/solicitudes",
      json=payload,
      headers={"X-Odoo-Solicitud-Secret": "<secreto>"},
      timeout=0.5,
  )
  ```
