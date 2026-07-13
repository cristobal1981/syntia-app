-- Portal automatizaciones: eliminar admin_only y unificar en visibility.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portal_automations'
      and column_name = 'advisor_visibility'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'portal_automations'
      and column_name = 'visibility'
  ) then
    alter table public.portal_automations
      rename column advisor_visibility to visibility;
  end if;
end $$;

-- Mantener semántica previa: admin_only=true implica invisibilidad para asesores.
update public.portal_automations
set visibility = 'none'
where coalesce(admin_only, false) = true;

alter table public.portal_automations
  alter column visibility set default 'none';

update public.portal_automations
set visibility = 'none'
where visibility is null;

alter table public.portal_automations
  alter column visibility set not null;

alter table public.portal_automations
  drop constraint if exists portal_automations_advisor_visibility_check;

alter table public.portal_automations
  drop constraint if exists portal_automations_visibility_check;

alter table public.portal_automations
  add constraint portal_automations_visibility_check
    check (visibility in ('none', 'all', 'selected'));

alter table public.portal_automations
  drop column if exists admin_only;
