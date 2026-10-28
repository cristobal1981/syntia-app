-- «Visto» del chatter en una sola sentencia y sin carreras. `upsertChatterReadStateBatch` leía
-- TODAS las filas de lectura del grupo (titular + colaboradores), calculaba el máximo en Node y
-- hacía upsert: una consulta de más que crece con los registros leídos y, si dos pestañas
-- marcaban a la vez, la última en escribir podía retroceder el «visto» de la otra.
--
-- Esta función hace el upsert con `greatest()` dentro de Postgres: el «visto» nunca retrocede y
-- no hace falta leer antes. Solo escribe si el mensaje avanza (`where`), así que repetir el
-- mismo «visto» no genera filas muertas. Los duplicados dentro de una misma llamada (mismo
-- usuario y registro) se agrupan con el máximo: un `insert … on conflict` los rechazaría.
--
-- El código cae al camino anterior si la función no existe todavía o falla, así que se puede
-- desplegar antes que la migración. El grupo (titular + colaboradores) lo sigue resolviendo la
-- aplicación.
create or replace function public.upsert_chatter_read_state(p_user_ids uuid[], p_entries jsonb)
returns void
language sql
set search_path = public
as $$
  insert into chatter_read_state (user_id, record_kind, record_id, last_seen_message_id, updated_at)
  select u.id, e.record_kind, e.record_id, max(e.last_seen_message_id), now()
  from unnest(p_user_ids) as u(id)
  cross join jsonb_to_recordset(p_entries)
    as e(record_kind text, record_id bigint, last_seen_message_id bigint)
  group by u.id, e.record_kind, e.record_id
  on conflict (user_id, record_kind, record_id)
  do update set
    last_seen_message_id = greatest(
      chatter_read_state.last_seen_message_id,
      excluded.last_seen_message_id
    ),
    updated_at = now()
  where excluded.last_seen_message_id > chatter_read_state.last_seen_message_id;
$$;

revoke all on function public.upsert_chatter_read_state(uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.upsert_chatter_read_state(uuid[], jsonb) to service_role;
