-- Dedup del cron de recordatorios de plazos fiscales: sin esto, el cron
-- reenviaría el mismo aviso cada día hasta que la obligación se cierre.
-- task_id (hoja de Odoo) como PK natural evita doble envío por la misma
-- obligación concreta.

create table if not exists public.obligacion_email_reminders (
  task_id integer primary key,
  partner_id integer not null,
  deadline date not null,
  sent_at timestamptz not null default now()
);

-- RLS: no se usa fuera de service_role (el cron llama siempre con esa
-- clave, como todo lo demás), pero se activa igual por consistencia con el
-- resto de tablas — ver 20261002095806_enable_rls.sql.
alter table public.obligacion_email_reminders enable row level security;
