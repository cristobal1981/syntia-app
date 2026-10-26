-- El portal usa tres estados de cuenta: active, invited y archived (archived corta el acceso: el
-- login, la vista como cliente y el push lo comprueban). La restricción users_status_check de la base
-- de datos no admitía 'archived', así que archivar a un cliente fallaba con
-- «new row for relation "users" violates check constraint "users_status_check"».
--
-- Se vuelve a crear con los tres valores. Falla (sin cambiar nada) si alguna fila tuviera otro
-- estado: en ese caso, mirar antes con `select distinct status from public.users;`.
alter table public.users drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check
  check (status in ('active', 'invited', 'archived'));
