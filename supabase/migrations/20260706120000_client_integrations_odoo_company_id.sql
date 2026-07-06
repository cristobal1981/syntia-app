alter table public.client_integrations
  add column if not exists odoo_company_id bigint;
