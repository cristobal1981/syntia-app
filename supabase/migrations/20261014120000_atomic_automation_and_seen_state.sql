-- Escrituras de varios pasos que debían ser atómicas.
--
-- Hasta ahora la app hacía varias llamadas sueltas (update + delete + insert,
-- N updates, leer-fusionar-escribir). Un fallo a medias dejaba el estado a
-- medias (un asesor sin permisos, un orden parcial, un «visto» pisado por una
-- pestaña concurrente). Estas funciones hacen cada operación en UNA sola
-- transacción. El código las usa si existen y, mientras no estén aplicadas,
-- cae al camino anterior, así que el orden de despliegue es indiferente.
--
-- Si algún tipo de columna no es el esperado la migración FALLA al aplicarse
-- (no deja una función rota): revisa el mensaje y ajusta los tipos.

do $$
declare
  expected record;
  actual text;
begin
  for expected in
    select * from (values
      ('portal_automations', 'id', 'uuid'),
      ('portal_automations', 'is_active', 'boolean'),
      ('portal_automations', 'visibility', 'text'),
      ('portal_automations', 'sort_order', 'integer'),
      ('portal_automation_advisor_grants', 'automation_id', 'uuid'),
      ('portal_automation_advisor_grants', 'advisor_id', 'uuid'),
      ('tramites_list_seen_state', 'user_id', 'uuid'),
      ('tramites_list_seen_state', 'open_item_keys', 'ARRAY')
    ) as t(table_name, column_name, data_type)
  loop
    select c.data_type into actual
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name;

    if actual is distinct from expected.data_type
       and not (expected.column_name = 'visibility' and actual = 'character varying')
       and not (expected.column_name = 'sort_order' and actual in ('smallint', 'bigint')) then
      raise exception 'Tipo inesperado en %.%: se esperaba %, hay %',
        expected.table_name, expected.column_name, expected.data_type, coalesce(actual, 'columna inexistente');
    end if;
  end loop;
end
$$;

-- Acceso de una automatización: estado + permisos de asesores en una transacción.
create or replace function public.update_portal_automation_access(
  p_automation_id uuid,
  p_is_active boolean,
  p_visibility text,
  p_granted_advisor_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.portal_automations
  set is_active = p_is_active,
      visibility = p_visibility,
      updated_at = now()
  where id = p_automation_id;

  delete from public.portal_automation_advisor_grants
  where automation_id = p_automation_id;

  if p_visibility = 'selected' and coalesce(array_length(p_granted_advisor_ids, 1), 0) > 0 then
    insert into public.portal_automation_advisor_grants (automation_id, advisor_id)
    select p_automation_id, advisor_id
    from unnest(p_granted_advisor_ids) as advisor_id;
  end if;
end;
$$;

-- Orden global: sort_order = posición en la lista, todo o nada.
create or replace function public.update_automation_global_order(p_ordered_ids uuid[])
returns void
language sql
set search_path = public
as $$
  update public.portal_automations as a
  set sort_order = o.position - 1,
      updated_at = now()
  from unnest(p_ordered_ids) with ordinality as o(id, position)
  where a.id = o.id;
$$;

-- Estado «visto» de trámites: une las claves en la base de datos (sin leer y
-- reescribir desde la app), para que dos acks simultáneos no se pisen.
create or replace function public.merge_tramites_list_seen_state(
  p_user_ids uuid[],
  p_open_item_keys text[]
)
returns void
language sql
set search_path = public
as $$
  insert into public.tramites_list_seen_state (user_id, open_item_keys, initialized, updated_at)
  select user_id, coalesce(p_open_item_keys, '{}'::text[]), true, now()
  from unnest(p_user_ids) as user_id
  on conflict (user_id) do update
  set open_item_keys = (
        select coalesce(array_agg(distinct key), '{}'::text[])
        from unnest(
          public.tramites_list_seen_state.open_item_keys || excluded.open_item_keys
        ) as key
      ),
      initialized = true,
      updated_at = now();
$$;

-- Solo la app (service_role) las llama; nada de exponerlas a anon/authenticated.
revoke all on function public.update_portal_automation_access(uuid, boolean, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.update_automation_global_order(uuid[])
  from public, anon, authenticated;
revoke all on function public.merge_tramites_list_seen_state(uuid[], text[])
  from public, anon, authenticated;

grant execute on function public.update_portal_automation_access(uuid, boolean, text, uuid[])
  to service_role;
grant execute on function public.update_automation_global_order(uuid[]) to service_role;
grant execute on function public.merge_tramites_list_seen_state(uuid[], text[]) to service_role;
