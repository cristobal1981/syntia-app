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

## Notas operativas

- Caducidad por defecto: 14 dias (`expires_at`).
- Estados invalidos esperados por la landing: `expired`, `used`, `revoked`, `not_found`.
- En v1 no se envia email desde Syntia: el enlace se copia manualmente.
