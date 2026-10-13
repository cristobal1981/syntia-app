-- Agregado para la columna "nº de clientes" de /equipo/gestores.
--
-- Antes, `gestores-page.tsx` traía TODOS los clientes (vía `listClients`,
-- tres tablas enriquecidas por fila) solo para contar cuántos tiene cada
-- asesor con un `for` en memoria. Esta función hace el `GROUP BY` en
-- Postgres y devuelve directamente el `Record<advisorId, count>` que la
-- UI necesita, sin traer ninguna fila de cliente a Node.
create or replace function public.count_clients_by_advisor()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(advisor_id, cnt), '{}'::jsonb)
  from (
    select p.advisor_id, count(*) as cnt
    from public.profiles p
    join public.users u on u.id = p.user_id
    where u.role = 'client' and p.advisor_id is not null
    group by p.advisor_id
  ) counts;
$$;
