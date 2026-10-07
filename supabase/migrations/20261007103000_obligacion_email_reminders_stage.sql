-- Dos avisos por obligación, no uno: `early` (al entrar en la ventana de
-- OBLIGACION_REMINDER_DAYS_AHEAD) y `urgent` (escalado, a
-- OBLIGACION_URGENT_REMINDER_DAYS_AHEAD) — ver resolve-obligacion-deadline.ts.
-- task_id ya no vale como PK por sí solo: una misma tarea puede tener una
-- fila por cada aviso enviado.

alter table public.obligacion_email_reminders
  add column if not exists reminder_type text not null default 'early';

alter table public.obligacion_email_reminders
  add constraint obligacion_email_reminders_reminder_type_check
  check (reminder_type in ('early', 'urgent'));

alter table public.obligacion_email_reminders
  drop constraint obligacion_email_reminders_pkey;

alter table public.obligacion_email_reminders
  add primary key (task_id, reminder_type);

alter table public.obligacion_email_reminders
  alter column reminder_type drop default;
