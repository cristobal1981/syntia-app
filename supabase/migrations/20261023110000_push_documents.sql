-- Aviso de documentos nuevos por push: tipo de evento `new_document` y su
-- preferencia por dispositivo («Documentos nuevos»). Aplicar ANTES de desplegar:
-- el dispatcher lee `notify_documents` y falla si la columna no existe. No crea
-- tablas, así que no necesita grants nuevos.

alter table public.push_subscriptions
  add column if not exists notify_documents boolean not null default true;

alter table public.portal_events
  drop constraint if exists portal_events_kind_check;

alter table public.portal_events
  add constraint portal_events_kind_check
  check (kind in ('message', 'status', 'new_record', 'new_firma', 'firma_due_soon', 'new_document'));
