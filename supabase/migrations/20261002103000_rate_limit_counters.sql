-- Contador de rate limiting por clave (acción+usuario), ventana fija.
-- No hay Redis/KV en el stack; se reutiliza Postgres (vía service_role,
-- igual que el resto de la app) en vez de memoria del proceso, que no
-- sirve en serverless (cada instancia tendría su propio contador).

create table if not exists public.rate_limit_counters (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

-- Check-and-increment atómico: una sola sentencia UPSERT evita el race
-- condition de "leer count, decidir, escribir" bajo concurrencia (dos
-- requests simultáneas del mismo usuario no deben poder saltarse el
-- límite). SECURITY DEFINER porque solo el dueño de la función (postgres)
-- tiene permiso de escritura en la tabla; quien la llama vía RPC con
-- service_role no necesita GRANT directo sobre rate_limit_counters.
create or replace function public.check_and_increment_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  insert into public.rate_limit_counters (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
  set
    window_start = case
      when public.rate_limit_counters.window_start <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.rate_limit_counters.window_start
    end,
    count = case
      when public.rate_limit_counters.window_start <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.rate_limit_counters.count + 1
    end
  returning public.rate_limit_counters.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- RLS: no se usa fuera de service_role (la app llama al RPC siempre con
-- esa clave, como todo lo demás), pero se activa igual por consistencia
-- con el resto de tablas — ver 20261002095806_enable_rls.sql.
alter table public.rate_limit_counters enable row level security;
