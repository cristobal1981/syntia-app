-- Identidad del portal en una sola consulta. Cada Server Action, ruta de lectura y tick del
-- sondeo de avisos resolvía el usuario del directorio (`users`, 1-2 consultas) y su cliente de
-- Odoo (`client_integrations`, con caché de proceso) por separado. Estas funciones lo hacen
-- en una sola ida y vuelta, y la señal de eventos del sondeo añade el último `seq` del cliente.
--
-- Mismo criterio que `resolveDirectoryActorId` + `getClientIntegrationByUserId`:
--  * el actor es `users.id` por `auth_user_id`; si no hay, por correo (`lower(p_email)`);
--  * el cliente de Odoo es `client_integrations.odoo_partner_id` del actor si es > 0.
-- Sin actor no devuelve filas: el código usa entonces el camino anterior. El código también
-- cae a ese camino si la función no existe todavía, así que se puede desplegar antes.

create or replace function public.portal_session_context(p_auth_user_id uuid, p_email text)
returns table (actor_id text, partner_id bigint)
language sql
stable
set search_path = public
as $$
  select
    a.id::text,
    (
      select ci.odoo_partner_id::bigint
      from client_integrations ci
      where ci.user_id = a.id and ci.odoo_partner_id > 0
      limit 1
    )
  from (
    select coalesce(
      (select u.id from users u where u.auth_user_id = p_auth_user_id limit 1),
      (select u.id from users u where u.email = lower(p_email) limit 1)
    ) as id
  ) a
  where a.id is not null;
$$;

-- Contexto + último evento del cliente (0 si no hay): lo que necesita cada tick del sondeo.
create or replace function public.portal_news_signal(p_auth_user_id uuid, p_email text)
returns table (actor_id text, partner_id bigint, seq bigint)
language sql
stable
set search_path = public
as $$
  select
    c.actor_id,
    c.partner_id,
    coalesce(
      (select max(e.seq) from portal_events e where e.partner_id = c.partner_id),
      0
    )::bigint
  from public.portal_session_context(p_auth_user_id, p_email) c;
$$;

revoke all on function public.portal_session_context(uuid, text) from public, anon, authenticated;
revoke all on function public.portal_news_signal(uuid, text) from public, anon, authenticated;
grant execute on function public.portal_session_context(uuid, text) to service_role;
grant execute on function public.portal_news_signal(uuid, text) to service_role;
