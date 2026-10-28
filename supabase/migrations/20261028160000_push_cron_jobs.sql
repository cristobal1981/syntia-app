-- Los jobs de pg_cron del push, en el repo. Hasta ahora vivían solo en Supabase: si se recrea la
-- base de datos o se monta otra, el push no arrancaba y no quedaba rastro de cómo se llamaba al
-- dispatcher. Esta migración los (re)crea de forma idempotente (`cron.schedule` con el mismo
-- nombre actualiza el job, no lo duplica).
--
-- Sin secretos: la cabecera `Authorization` se lee del Vault por nombre en cada ejecución
-- (`push_dispatch_secret`, el mismo valor que `PUSH_DISPATCH_SECRET` en Vercel). El secreto lo
-- sigue poniendo quien administra Supabase; aquí solo aparece su nombre.
--
-- Solo programa los jobs donde pueden funcionar (pg_cron, pg_net y el secreto del Vault): en una
-- base de desarrollo sin esos elementos avisa y sigue, así que no rompe y, sobre todo, no
-- apunta una base de pruebas a producción. `purge-portal-events` ya se programa en
-- 20261022140000_portal_events.sql.
--
--  * push-dispatch: cada minuto, pero solo llama a Vercel si hay trabajo (`dispatch_has_work()`)
--    o en los minutos múltiplos de 10 (latido: el monitor de salud da `pulse_stalled` si pasan
--    más de 15 min sin ninguna ejecución en `push_runs`). Solo vale con PUSH_SOURCE=events.
--  * push-reconcile: cada 30 min, barrido que recupera mensajes cuyo evento no llegó.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron no está instalado: no se programan los jobs de push';
    return;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_net no está instalado: no se programan los jobs de push';
    return;
  end if;

  if to_regclass('vault.decrypted_secrets') is null
     or not exists (
       select 1 from vault.decrypted_secrets where name = 'push_dispatch_secret'
     ) then
    raise notice 'falta el secreto push_dispatch_secret en el Vault: no se programan los jobs de push';
    return;
  end if;

  perform cron.schedule(
    'push-dispatch',
    '* * * * *',
    $cmd$
  select net.http_post(
    url := 'https://app.syntia.es/api/push/dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')
    ),
    timeout_milliseconds := 60000
  )
  where public.dispatch_has_work()
     or extract(minute from now())::int % 10 = 0;
  $cmd$
  );

  perform cron.schedule(
    'push-reconcile',
    '*/30 * * * *',
    $cmd$
  select net.http_post(
    url := 'https://app.syntia.es/api/push/reconcile',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')
    ),
    timeout_milliseconds := 60000
  );
  $cmd$
  );
end
$$;
