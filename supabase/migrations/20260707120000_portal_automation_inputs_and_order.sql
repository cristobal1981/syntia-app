-- Campos de entrada (selects predefinidos) por automatización + orden personal por usuario.

alter table public.portal_automations
  add column if not exists input_fields jsonb not null default '[]'::jsonb;

alter table public.portal_automations
  add constraint portal_automations_input_fields_is_array
  check (jsonb_typeof(input_fields) = 'array');

-- Orden personal: pisa el orden global solo para ese usuario.
create table if not exists public.portal_automation_user_order (
  user_id uuid not null references public.users(id) on delete cascade,
  automation_id uuid not null references public.portal_automations(id) on delete cascade,
  position integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, automation_id)
);

create index if not exists portal_automation_user_order_user_position_idx
  on public.portal_automation_user_order (user_id, position);

alter table public.portal_automation_user_order enable row level security;
revoke all on table public.portal_automation_user_order from anon, authenticated;
