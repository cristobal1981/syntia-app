-- Calendario de avisos por franjas (ver resolve-obligacion-notice.ts): los
-- tipos pasan a ser `domiciliar`, `normal` y `presentacion`, y un mismo tipo
-- puede repetirse en días distintos (`domiciliar` sale los días 10 y 14), así
-- que el día del aviso entra en la clave. Los tipos antiguos (`early`,
-- `urgent`) se conservan válidos para no tocar las filas ya enviadas.

alter table public.obligacion_email_reminders
  add column if not exists notice_date date;

update public.obligacion_email_reminders
  set notice_date = (sent_at at time zone 'Atlantic/Canary')::date
  where notice_date is null;

alter table public.obligacion_email_reminders
  alter column notice_date set not null;

alter table public.obligacion_email_reminders
  drop constraint if exists obligacion_email_reminders_reminder_type_check;

alter table public.obligacion_email_reminders
  add constraint obligacion_email_reminders_reminder_type_check
  check (reminder_type in ('early', 'urgent', 'domiciliar', 'normal', 'presentacion'));

alter table public.obligacion_email_reminders
  drop constraint if exists obligacion_email_reminders_pkey;

alter table public.obligacion_email_reminders
  add primary key (task_id, reminder_type, notice_date);
