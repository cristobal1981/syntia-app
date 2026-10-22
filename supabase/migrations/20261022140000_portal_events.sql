-- Eventos que Odoo envía al portal (webhook de una acción automatizada) y
-- registro de ejecuciones del dispatcher de push. Sustituye, para el push, al
-- cálculo de avisos por snapshots de Odoo: el evento ya trae lo necesario y el
-- dispatcher no consulta Odoo.
--
-- Solo se usa con service_role (ruta del webhook y dispatcher), como el resto
-- de tablas de la app — ver 20261002095806_enable_rls.sql.

create table if not exists public.portal_events (
  -- Orden global de llegada: cada dispositivo guarda hasta qué `seq` ha
  -- procesado (`push_subscriptions.last_event_seq`).
  seq bigint generated always as identity primary key,
  -- Identificador estable del cambio en Odoo (p. ej. `msg:456`,
  -- `task:123:2026-10-22 10:00:00`): un reintento de Odoo no duplica el aviso.
  event_id text not null,
  partner_id bigint not null,
  kind text not null check (kind in ('message', 'status', 'new_record', 'new_firma')),
  scope text not null check (scope in ('tramite', 'consulta', 'obligacion', 'firma')),
  record_id bigint not null,
  record_name text not null,
  state_label text,
  previous_state_label text,
  message_id bigint,
  -- Extracto del mensaje: se vacía a la hora (el push caduca a la hora).
  excerpt text,
  -- El cambio lo hizo el propio cliente desde el portal: no se le avisa.
  by_client boolean not null default false,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create unique index if not exists portal_events_event_id_key
  on public.portal_events (event_id);

create index if not exists portal_events_partner_seq_idx
  on public.portal_events (partner_id, seq);

create index if not exists portal_events_received_idx
  on public.portal_events (received_at);

alter table public.portal_events enable row level security;

grant select, insert, update, delete on public.portal_events to service_role;

-- Hasta qué evento ha procesado cada dispositivo. `null` = aún sin foto
-- inicial: la primera ejecución con eventos lo coloca en el último `seq` sin
-- mandar nada (igual que `baselined_at` con el cálculo por snapshots).
alter table public.push_subscriptions
  add column if not exists last_event_seq bigint;

-- Una fila por ejecución del dispatcher, para vigilar errores, truncados y
-- ejecuciones saltadas sin depender de n8n ni de los logs de Vercel.
create table if not exists public.push_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source text not null check (source in ('events', 'snapshots')),
  users integer not null default 0,
  sent integer not null default 0,
  skipped integer not null default 0,
  removed integer not null default 0,
  truncated boolean not null default false,
  locked boolean not null default false,
  error text
);

create index if not exists push_runs_started_idx on public.push_runs (started_at);

alter table public.push_runs enable row level security;

grant select, insert, update, delete on public.push_runs to service_role;

-- Privacidad y tamaño: el extracto se borra a la hora, el evento a los 2 días
-- y el registro de ejecuciones a los 30.
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
  where received_at < now() - interval '2 days';

  delete from public.push_runs
  where started_at < now() - interval '30 days';
$$;

revoke all on function public.purge_portal_events() from public;
grant execute on function public.purge_portal_events() to service_role;

-- Limpieza cada hora con pg_cron (si la extensión está activada). La llamada
-- periódica al dispatcher NO se programa aquí: lleva la URL del despliegue y el
-- secreto, así que se crea a mano (ver el plan en Notion).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('purge-portal-events', '17 * * * *', 'select public.purge_portal_events()');
  end if;
end
$$;
