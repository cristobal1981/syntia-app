# Integraciones de cliente (`client_integrations`)

Contexto para desarrollo y agentes. Leer antes de tocar Odoo, Drive o directorio de clientes.

## Esquema

Tabla `public.client_integrations` en Supabase:

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id`, UNIQUE (1 fila por cliente) |
| `odoo_partner_id` | int4 | ID contacto/empresa en Odoo |
| `drive_folder_id` | text | ID carpeta Google Drive |
| `created_at` / `updated_at` | timestamptz | |

Relaciones:

- `users` — cuenta portal (auth, rol, email)
- `profiles` — datos personales (nombre, empresa, asesor, fiscal…)
- `client_integrations` — **solo** IDs de sistemas externos

Los IDs **no** viven en `profiles`.

## Riesgo de seguridad

`odoo_partner_id` es entero secuencial. `drive_folder_id` es predecible. Si se filtran a UI pública, URLs o APIs, un atacante puede enumerar IDs y tentar acceder a datos de otros usuarios en Odoo/Drive (IDOR) si las APIs externas no validan ownership.

## Reglas de exposición

| Contexto | Permitido | Prohibido |
| --- | --- | --- |
| Portal cliente (`/tramites`, home) | Lookup server-side: sesión → `user_id` → `client_integrations` → API externa | `partner_id` / `folder_id` en URL, query, props al navegador, JSON al cliente |
| Equipo (`/equipo/clientes`) | Editar en formulario create/edit (admin/advisor) | Columnas/listados con IDs Odoo o Drive |
| Infra | `createSupabaseAdminClient()` en server actions / RSC | Client components con anon key; `NEXT_PUBLIC_*` con IDs |
| Trámites | `resolveClientOdooPartnerId(user)` desde actor de sesión | Endpoints que acepten `partnerId` arbitrario |

Patrón obligatorio:

```
Sesión → resolveDirectoryActorId → client_integrations (user_id) → Odoo/Drive (server)
```

El navegador del cliente **nunca** recibe `odoo_partner_id` ni `drive_folder_id`.

## Flujos

### Alta / edición cliente (equipo)

1. Formulario [`client-form.tsx`](../../src/modules/directory/ui/client-form.tsx) — selector **Autónomo / Empresa**; campos dinámicos; Odoo y Drive.
2. **Empresa:** `profiles.company_name` = razón social; nombres vacíos; `users.email` = correo de contacto (nóminas/comunicaciones). El correo corporativo de Odoo (`email`) no se persiste en v1.
3. **Autónomo:** nombre + apellidos + correo obligatorios; nombre comercial opcional en `company_name`.
4. **Import desde Odoo (solo create):** al abrir el diálogo, `listOdooPartnersForImportAction` carga catálogo cacheado (`unstable_cache`, tag `odoo-partner-catalog`, TTL ~10 min).
5. Filtro Odoo: `res.partner` con `x_studio_google_drive` (URL carpeta **padre** en Odoo) relleno; excluye `odoo_partner_id` ya en `client_integrations`. Lee también `x_studio_email_recepcion_nominas` (`ODOO_PARTNER_CONTACT_EMAIL_FIELD`) como correo de contacto en empresas.
6. `x_studio_google_drive` → ID carpeta padre; la subcarpeta **pública** de documentos se resuelve vía Google Drive API (`GOOGLE_DRIVE_SERVICE_ACCOUNT_*`, nombre por defecto `Pública` / `GOOGLE_DRIVE_PUBLIC_SUBFOLDER_NAME`).
7. Selección en UI rellena formulario sin petición Odoo extra (catálogo en memoria). Si Odoo marca `is_company`, el tipo por defecto es Empresa.
8. Tras `createClientAction` exitoso: `updateTag('odoo-partner-catalog')`.
9. Server actions [`directory-mutations.ts`](../../src/modules/directory/application/directory-mutations.ts).
10. [`directory-repository.supabase.ts`](../../src/modules/directory/infrastructure/directory-repository.supabase.ts): `profiles` + `upsertClientIntegration`.
11. Rollback en create: `deleteClientIntegration` antes de borrar `users`.

**Odoo 19:** no usar campo `mobile` en `res.partner` (eliminado); solo `phone`.

### Trámites (portal cliente)

1. [`get-tramites-for-client.ts`](../../src/modules/tramites/application/get-tramites-for-client.ts)
2. [`resolve-client-odoo-partner-id.ts`](../../src/modules/tramites/application/resolve-client-odoo-partner-id.ts) → `getClientIntegrationByUserId`
3. [`odoo-tramites-repository.ts`](../../src/modules/tramites/infrastructure/odoo-tramites-repository.ts)

### Drive (futuro)

[`drive-client.ts`](../../src/modules/portal/infrastructure/drive-client.ts) es stub. Cuando se implemente, resolver `drive_folder_id` igual que Odoo: solo server-side desde sesión.

## Archivos clave

| Archivo | Rol |
| --- | --- |
| `src/modules/directory/domain/map-directory-row.ts` | `ClientIntegrationRow`, mapeo a `ClientRecord` |
| `src/modules/directory/infrastructure/client-integrations.supabase.ts` | fetch, upsert, delete |
| `src/modules/directory/infrastructure/directory-repository.supabase.ts` | CRUD cliente + integraciones |
| `src/modules/directory/infrastructure/odoo-partner-catalog.ts` | Catálogo Odoo cacheado para import |
| `src/modules/directory/domain/odoo-partner-import.ts` | Mapeo partner → borrador formulario |
| `src/modules/tramites/application/resolve-client-odoo-partner-id.ts` | Partner Odoo desde sesión |

## Anti-patrones

- Mostrar `odooPartnerId` o `driveFolderId` en listados (`PersonList`, tarjetas).
- Pasar `partnerId` como searchParam o body de API pública.
- Leer `client_integrations` desde componentes `'use client'`.
- Aceptar ID de integración desde input de usuario en portal cliente.
- Exponer catálogo Odoo completo fuera de server actions de equipo (`listOdooPartnersForImportAction`).

## Futuro

- RLS en `client_integrations` si se consulta Supabase con JWT de usuario: deny-by-default; rol `client` solo fila propia (`user_id` = actor).
