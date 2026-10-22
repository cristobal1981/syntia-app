-- Barrido de reconciliación de mensajes: guarda hasta qué mensaje de Odoo se ha
-- revisado (los ids de `mail.message` solo crecen, así que basta un cursor), y
-- amplía el origen de `push_runs` para registrar también los barridos.

create table if not exists public.portal_sweep_state (
  id smallint primary key default 1 check (id = 1),
  -- Último `mail.message.id` revisado. `null` = aún sin foto inicial: el primer
  -- barrido parte del último mensaje existente, sin recuperar histórico.
  last_message_id bigint,
  updated_at timestamptz not null default now()
);

insert into public.portal_sweep_state (id) values (1) on conflict (id) do nothing;

alter table public.portal_sweep_state enable row level security;

grant select, insert, update, delete on public.portal_sweep_state to service_role;

alter table public.push_runs drop constraint if exists push_runs_source_check;
alter table public.push_runs
  add constraint push_runs_source_check check (source in ('events', 'snapshots', 'sweep'));
