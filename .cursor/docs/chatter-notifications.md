# Notificaciones de chatter (`chatter_read_state`)

> **Nota:** El sistema completo del portal (estados, documentos, firmas) está documentado en [`portal-notifications.md`](./portal-notifications.md).

Contexto para desarrollo y agentes. Leer antes de tocar el poll de mensajes o el estado leído.

## Esquema

Tabla `public.chatter_read_state` en Supabase:

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` |
| `record_kind` | text | `'task'` \| `'ticket'` |
| `record_id` | integer | ID en Odoo (`project.task` o ticket) |
| `last_seen_message_id` | integer | Último `mail.message.id` visto en Conversación |
| `updated_at` | timestamptz | |

Constraint: `unique (user_id, record_kind, record_id)`.

SQL de creación:

```sql
create table public.chatter_read_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  record_kind text not null check (record_kind in ('task', 'ticket')),
  record_id integer not null,
  last_seen_message_id integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, record_kind, record_id)
);

create index chatter_read_state_user_id_idx on public.chatter_read_state(user_id);
```

## Reglas de negocio

- Solo rol **client** del portal.
- **No leído** = mensaje visible del gestor (`author_id !== partner cliente`) con `id > last_seen_message_id`.
- **Marcar leído** solo al abrir la pestaña **Conversación** y cargar mensajes (no basta abrir Documentos).
- **Baseline silencioso**: primer poll sin fila en Supabase guarda el `max(id)` actual como leído, sin notificar histórico.
- Caché en `localStorage` (`syntia-chatter-read-state`); Supabase es fuente de verdad entre dispositivos.

## Poll

- Intervalo: `ODOO_CHATTER_NOTIFICATIONS_POLL_INTERVAL_MS` (default 60000).
- Solo con `document.visibilityState === 'visible'`.
- Una server action por tick: watchlist de trámites + batch Odoo + merge read state.

## Seguridad

- Acceso Supabase solo con `createSupabaseAdminClient()` en server actions.
- Verificación de ownership vía `verifyRecordBelongsToPartner` al marcar leído.
- El navegador no recibe `odoo_partner_id`.
- **RLS:** `enable row level security` + `revoke` a `anon`/`authenticated`. Sin políticas → deny-by-default para JWT; `service_role` sin cambios. Script: [`supabase/rls-portal-state-tables.sql`](../../supabase/rls-portal-state-tables.sql).

## Archivos clave

| Archivo | Rol |
| --- | --- |
| `src/modules/portal/infrastructure/chatter-read-state.supabase.ts` | CRUD read state |
| `src/modules/portal/infrastructure/odoo-messages-repository.ts` | Batch unread candidates |
| `src/modules/portal/application/portal-chatter-notifications-actions.ts` | check / mark |
| `src/modules/portal/ui/chatter-notifications-context.tsx` | Poll + localStorage |
| `src/modules/portal/ui/notification-bell.tsx` | Campana topbar |
