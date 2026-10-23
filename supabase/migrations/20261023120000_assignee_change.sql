-- Aviso «ahora te atiende X»: nuevo tipo de evento y el seguimiento de quién lo
-- llevaba cuando el usuario lo vio. Aplicar ANTES de desplegar: sin el `check` el
-- webhook no podría guardar el evento. No crea tablas, así que no necesita grants.

alter table public.portal_events
  drop constraint if exists portal_events_kind_check;

alter table public.portal_events
  add constraint portal_events_kind_check
  check (kind in ('message', 'status', 'new_record', 'new_firma', 'firma_due_soon', 'assignee_change'));

-- Huella de los responsables que el usuario ya vio (ids de usuario de Odoo
-- ordenados y unidos por comas; cadena vacía = nadie). `null` = fila anterior a
-- esta columna: la primera comprobación la rellena sin avisar.
alter table public.portal_record_watch_state
  add column if not exists last_assignee_key text;
