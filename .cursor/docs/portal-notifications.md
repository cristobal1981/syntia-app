# Notificaciones del portal

Sistema unificado de novedades para clientes del portal. Complementa y extiende la documentación histórica de [`chatter-notifications.md`](./chatter-notifications.md).

## Razones (`PortalNotificationReason`)

| Razón | Ámbito | Detección |
| --- | --- | --- |
| `unread_chatter` | trámite, consulta | Mensaje del asesor con `id > last_seen_message_id` |
| `new_tramite` | trámite abierto | Clave no vista en `tramites_list_seen_state` |
| `status_change` | trámite, consulta, obligación | Delta de estado; incluye cierre (`isCloseEvent`) |
| `new_document` | trámite, consulta, obligación | `attachmentCount` subió respecto a `portal_record_watch_state` |
| `new_firma` | firma pendiente | ID nuevo tras baseline del portal |
| `firma_due_soon` | firma pendiente | Vence en ≤7 días (`SIGNATURE_DUE_SOON_DAYS`), dedup por registro |

**Consultas:** mismas reglas de estado/documentos que trámites; **sin** notificación de «consulta nueva».

**Registros cerrados:** si ya estaban cerrados en el último snapshot guardado, se ignoran cambios posteriores. Excepción: transición `abierto → cerrado` → una notificación de cierre.

## Tablas Supabase

### `portal_record_watch_state` (nueva)

Script: [`supabase/portal-record-watch-state.sql`](../../supabase/portal-record-watch-state.sql)

| Columna | Uso |
| --- | --- |
| `record_scope` | `tramite` \| `consulta` \| `obligacion` \| `firma` |
| `record_id` | ID Odoo o `sign.request.id` |
| `last_state` | Estado Odoo o `open`/`closed` en consultas |
| `last_is_closed` | Cierre hecho/cancelado |
| `last_attachment_count` | Conteo en último poll/ack |
| `firma_due_soon_notified` | Dedup vencimiento firma |
| `initialized` | Baseline silencioso por registro |

Se mantienen `chatter_read_state` y `tramites_list_seen_state`.

## Poll

- Acción: `checkPortalNotificationsAction` → `loadClientPortalNotifications`
- Intervalo: `ODOO_CHATTER_NOTIFICATIONS_POLL_INTERVAL_MS` (default 30s, min 15s, max 600s)
- Backoff máximo: `ODOO_CHATTER_NOTIFICATIONS_POLL_MAX_INTERVAL_MS` (default 300s)
- Solo con pestaña visible
- Provider: `PortalNotificationsProvider` en `portal-shell.tsx`

## Caché Odoo (90s snapshots, 60s chatter batch)

| Snapshot | Función |
| --- | --- |
| Trámites + consultas | `getCachedTramitesSnapshot` |
| Obligaciones (hojas) | `getCachedObligacionNotificationSnapshot` |
| Firmas pendientes | `getCachedPendingSignaturesSnapshot` |

Chatter: batch `mail.message` solo sobre trámites/consultas **abiertos**.

## Ack / dismiss

| Acción | Cuándo |
| --- | --- |
| `markChatterConversationSeenAction` | Pestaña Conversación |
| `dismissNewTramiteNotification` (cliente) | Abrir trámite nuevo |
| `ackPortalNotificationAction` | Click en campana / documentos vistos |

Deep links:

- Trámite/consulta: `/tramites?open={kind}-{id}&tab=conversation|documents`
- Obligación: `/obligaciones?open=task-{id}`
- Firma: `/firmas`

## Archivos clave

| Archivo | Rol |
| --- | --- |
| `src/modules/portal/application/load-client-portal-notifications.ts` | Loader unificado |
| `src/modules/portal/domain/compute-portal-notifications.ts` | Diff puro |
| `src/modules/portal/infrastructure/portal-record-watch-state.supabase.ts` | CRUD watch state |
| `src/modules/portal/ui/portal-notifications-context.tsx` | Poll + UI state |
