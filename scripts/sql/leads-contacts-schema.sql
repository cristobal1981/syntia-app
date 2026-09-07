-- Registro de emails de seguimiento enviados manualmente a leads de
-- landing_autonomo_leads que no acabaron siendo clientes reales.
-- No hay sistema de migraciones en el repo — ejecutar esto a mano una vez
-- contra el proyecto de Supabase antes de desplegar esta rama.

create table if not exists landing_autonomo_lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references landing_autonomo_leads(id) on delete cascade,
  sent_by uuid not null references users(id),
  sent_to text not null,
  subject text not null,
  body_html text not null,
  body_text text,
  resend_email_id text,
  created_at timestamptz not null default now()
);

create index if not exists landing_autonomo_lead_contacts_lead_id_idx
  on landing_autonomo_lead_contacts (lead_id);
