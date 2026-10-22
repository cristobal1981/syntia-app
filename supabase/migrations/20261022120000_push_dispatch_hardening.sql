-- Endurecimiento del dispatcher de push:
--  1) `failure_count`: envíos seguidos rechazados por el servicio de push
--     (400/401/403/413); se pone a 0 en cuanto un envío sale bien.
--  2) Cerrojo de ejecución: una sola ejecución del dispatcher a la vez, para
--     que un reintento o un solape no manden dos veces lo mismo.

alter table public.push_subscriptions
  add column if not exists failure_count integer not null default 0;

create table if not exists public.push_dispatch_lock (
  id smallint primary key default 1 check (id = 1),
  locked_until timestamptz not null default 'epoch'
);

insert into public.push_dispatch_lock (id) values (1) on conflict (id) do nothing;

alter table public.push_dispatch_lock enable row level security;

grant select, insert, update, delete on public.push_dispatch_lock to service_role;

-- Toma el cerrojo durante `p_ttl_seconds` si nadie lo tiene vigente. Si la
-- ejecución muere sin soltarlo, caduca solo.
create or replace function public.acquire_push_dispatch_lock(p_ttl_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taken integer;
begin
  update public.push_dispatch_lock
  set locked_until = now() + make_interval(secs => p_ttl_seconds)
  where id = 1 and locked_until <= now();

  get diagnostics v_taken = row_count;
  return v_taken > 0;
end;
$$;

create or replace function public.release_push_dispatch_lock()
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_dispatch_lock set locked_until = 'epoch' where id = 1;
$$;

revoke all on function public.acquire_push_dispatch_lock(integer) from public;
revoke all on function public.release_push_dispatch_lock() from public;
grant execute on function public.acquire_push_dispatch_lock(integer) to service_role;
grant execute on function public.release_push_dispatch_lock() to service_role;
