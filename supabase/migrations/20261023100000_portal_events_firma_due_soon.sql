-- Aviso «una firma vence pronto» en el modo por eventos. A diferencia del resto
-- no lo manda Odoo: lo crea el barrido de /api/push/reconcile (es por fecha, no
-- por un cambio). Solo amplía los tipos de evento admitidos; no crea tablas.

alter table public.portal_events
  drop constraint if exists portal_events_kind_check;

alter table public.portal_events
  add constraint portal_events_kind_check
  check (kind in ('message', 'status', 'new_record', 'new_firma', 'firma_due_soon'));
