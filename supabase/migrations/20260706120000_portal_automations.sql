-- Portal: catálogo de automatizaciones n8n, permisos asesores y log de ejecuciones.
-- Solo syntia-app (service role) accede; sin políticas RLS para anon/authenticated.

create table if not exists public.portal_automations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  webhook_path text not null,
  icon text not null default 'workflow',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  admin_only boolean not null default false,
  advisor_visibility text not null default 'none'
    check (advisor_visibility in ('none', 'all', 'selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_automation_advisor_grants (
  automation_id uuid not null references public.portal_automations(id) on delete cascade,
  advisor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (automation_id, advisor_id)
);

create index if not exists portal_automation_advisor_grants_advisor_id_idx
  on public.portal_automation_advisor_grants (advisor_id);

create table if not exists public.portal_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.portal_automations(id) on delete cascade,
  triggered_by uuid not null references public.users(id) on delete restrict,
  status text not null check (status in ('sent', 'failed')),
  http_status integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists portal_automation_runs_automation_created_idx
  on public.portal_automation_runs (automation_id, created_at desc);

create index if not exists portal_automation_runs_triggered_by_created_idx
  on public.portal_automation_runs (triggered_by, created_at desc);

alter table public.portal_automations enable row level security;
alter table public.portal_automation_advisor_grants enable row level security;
alter table public.portal_automation_runs enable row level security;

revoke all on table public.portal_automations from anon, authenticated;
revoke all on table public.portal_automation_advisor_grants from anon, authenticated;
revoke all on table public.portal_automation_runs from anon, authenticated;

-- Ejemplo (descomenta y ajusta webhook_path tras crear el workflow en n8n):
-- insert into public.portal_automations (slug, title, description, webhook_path, advisor_visibility)
-- values (
--   'sync-odoo-partners',
--   'Sincronizar partners Odoo',
--   'Relanza la sincronización manual de contactos con Odoo.',
--   '/webhook/sync-odoo-partners',
--   'none'
-- );
