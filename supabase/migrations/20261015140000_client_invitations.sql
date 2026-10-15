-- Invitaciones de clientes a conocer Syntia (botón «Invitar a alguien» del
-- panel del perfil). Solo guarda quién invitó a qué correo y cuándo: el límite
-- de invitaciones por cliente se cuenta aquí y, de momento, no hay descuento
-- ni puntos asociados.
--
-- El correo invitado es único (sin distinguir mayúsculas): a una persona no se
-- le manda dos veces la misma invitación aunque la inviten clientes distintos.

create table if not exists public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null,
  invitee_email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists client_invitations_invitee_email_key
  on public.client_invitations (lower(invitee_email));

create index if not exists client_invitations_inviter_idx
  on public.client_invitations (inviter_user_id);

-- Solo se usa con service_role (acciones del servidor), como el resto de
-- tablas de la app — ver 20261002095806_enable_rls.sql.
alter table public.client_invitations enable row level security;
