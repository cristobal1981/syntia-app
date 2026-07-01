# Chatter: responder, adjuntos y subida

Complemento de [`chatter-notifications.md`](./chatter-notifications.md).

## Lectura (`mail.message`)

Campos añadidos al `search_read` de la conversación:

| Campo | Uso |
| --- | --- |
| `parent_id` | Hilo de respuesta |
| `attachment_ids` | Chips en burbuja; nombres vía batch `ir.attachment` |

Una sola petición extra por página solo si hay IDs de adjunto sin nombre en cache.

## Escritura

1. `ir.attachment` `create` — `name`, `datas`, `mimetype`, `res_model`, `res_id`
2. `{resModel}/message_post` — `parent_id`, `attachment_ids`, `body_is_html: true` (fallback: `mail.message` `create`)
3. Tras subida cliente: `updateTag(tramitesSnapshotCacheTag)` + advance `last_attachment_count` en watch state (sin `new_document` propio)

Validaciones en `portal-chatter-actions.ts`: ownership, parent del mismo registro, MIME/tamaño/cantidad.

## UI

- Adjuntos en chat: nombre + enlace → pestaña Documentos del drawer (`highlightAttachmentId`).
- Subida: solo al enviar mensaje en Conversación (no en Documentos).
- Mock: `NEXT_PUBLIC_PORTAL_CHATTER_MOCK=true` → datos estáticos en `chatter-mock-data.ts`.

## Archivos

| Archivo | Rol |
| --- | --- |
| `portal-chatter-actions.ts` | Server actions list/post |
| `odoo-messages-repository.ts` | Listado, parent, post |
| `odoo-attachments-repository.ts` | Nombres batch, create |
| `record-chatter-panel.tsx` | Panel + mock |
| `chatter-message-item.tsx` | Burbuja, reply, chips |
