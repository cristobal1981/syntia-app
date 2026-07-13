create table if not exists public.onboarding_form_access_tokens (
  id bigserial primary key,
  token text not null unique default gen_random_uuid()::text,
  form_kind text not null default 'alta_autonomo',
  recipient_email text,
  odoo_partner_id bigint,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists onboarding_form_access_tokens_active_partner_unique
  on public.onboarding_form_access_tokens (form_kind, odoo_partner_id)
  where odoo_partner_id is not null
    and used_at is null
    and revoked_at is null;

create unique index if not exists onboarding_form_access_tokens_active_email_unique
  on public.onboarding_form_access_tokens (form_kind, recipient_email)
  where recipient_email is not null
    and used_at is null
    and revoked_at is null;

alter table public.onboarding_form_access_tokens enable row level security;

revoke all on table public.onboarding_form_access_tokens from anon, authenticated;
