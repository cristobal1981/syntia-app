-- «¿Hay trabajo para el dispatcher de push?» en una sola consulta ligera. Hoy pg_cron
-- invoca /api/push/dispatch cada minuto (1.440 ejecuciones de Vercel al día) y más del 98 %
-- no hacen nada. El job de pg_cron puede llamar a esta función y solo invocar a Vercel si
-- devuelve true (ver el ejemplo al final).
--
-- Solo vale con PUSH_SOURCE=events: en modo snapshots el trabajo sale de Odoo, no de la cola.
--
-- Devuelve true (nunca se salta trabajo; un falso positivo solo cuesta una ejecución vacía):
--  1. algún dispositivo sin foto inicial (`last_event_seq` nulo): la primera ejecución lo
--     coloca en el último evento;
--  2. algún evento no caducado posterior al cursor más atrasado. Un evento sin madurar
--     (<30 s) cuenta: el dispatcher lo envía en la ejecución siguiente.
--
-- El plazo de 1 hora es `EVENT_MAX_AGE_MS` de run-event-push-dispatch.ts; si cambia uno,
-- cambia el otro (hay un test que lo comprueba).
create or replace function public.dispatch_has_work()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (select 1 from push_subscriptions where last_event_seq is null)
    or exists (
      select 1
      from portal_events e
      where e.received_at >= now() - interval '1 hour'
        and e.seq > (
          select min(last_event_seq) from push_subscriptions where last_event_seq is not null
        )
    );
$$;

revoke all on function public.dispatch_has_work() from public, anon, authenticated;
grant execute on function public.dispatch_has_work() to service_role;

-- Ejemplo de cómo usarla en el job (NO se aplica aquí: la URL y el secreto viven en
-- Supabase/Vault). Hay que mantener un latido: el monitor de salud da `pulse_stalled`
-- si pasan más de 15 min sin ninguna fila en `push_runs`, así que sin trabajo se llama
-- igualmente cada 10 min (también limpia suscripciones de usuarios dados de baja):
--
--   with go as (
--     select public.dispatch_has_work()
--            or extract(minute from now())::int % 10 = 0 as run
--   )
--   <la sentencia net.http_post actual del job> ... where (select run from go);
