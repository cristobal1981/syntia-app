-- `firma_due_soon` lo crea un barrido con un event_id estable (solicitud, firmante, fecha):
-- el índice único evita repetirlo, pero solo mientras la fila exista. Con la retención de
-- 2 días el aviso se recreaba (y volvía a sonar) cada 2 días durante toda la ventana de
-- vencimiento. Estos eventos se conservan 10 días (la ventana «vence pronto» es de 7).
-- El resto sigue igual: extracto a la hora, evento a los 2 días, ejecuciones a los 30.
create or replace function public.purge_portal_events()
returns void
language sql
security definer
set search_path = public
as $$
  update public.portal_events
  set excerpt = null
  where excerpt is not null and received_at < now() - interval '1 hour';

  delete from public.portal_events
  where kind <> 'firma_due_soon' and received_at < now() - interval '2 days';

  delete from public.portal_events
  where kind = 'firma_due_soon' and received_at < now() - interval '10 days';

  delete from public.push_runs
  where started_at < now() - interval '30 days';
$$;

revoke all on function public.purge_portal_events() from public;
grant execute on function public.purge_portal_events() to service_role;
