-- RLS para tablas de estado del portal cliente (solo acceso vía service role en server actions).
-- Ejecutar en Supabase SQL Editor después de crear las tablas.
--
-- Con RLS activo y sin políticas para authenticated/anon: el cliente JS no puede leer ni escribir.
-- createSupabaseAdminClient() (service_role) sigue funcionando con normalidad.

-- ---------------------------------------------------------------------------
-- chatter_read_state
-- ---------------------------------------------------------------------------

alter table public.chatter_read_state enable row level security;

revoke all on table public.chatter_read_state from anon, authenticated;

-- Opcional: políticas si en el futuro usas createSupabaseServerClient() con JWT.
-- Requiere que public.users tenga auth_user_id y que el usuario pueda resolver su fila.
--
-- create or replace function public.portal_user_id()
-- returns uuid
-- language sql
-- stable
-- security definer
-- set search_path = public
-- as $$
--   select id from public.users where auth_user_id = auth.uid() limit 1;
-- $$;
--
-- revoke all on function public.portal_user_id() from public;
-- grant execute on function public.portal_user_id() to authenticated;
--
-- create policy chatter_read_state_select_own
--   on public.chatter_read_state
--   for select
--   to authenticated
--   using (user_id = public.portal_user_id());
--
-- create policy chatter_read_state_insert_own
--   on public.chatter_read_state
--   for insert
--   to authenticated
--   with check (user_id = public.portal_user_id());
--
-- create policy chatter_read_state_update_own
--   on public.chatter_read_state
--   for update
--   to authenticated
--   using (user_id = public.portal_user_id())
--   with check (user_id = public.portal_user_id());
--
-- create policy chatter_read_state_delete_own
--   on public.chatter_read_state
--   for delete
--   to authenticated
--   using (user_id = public.portal_user_id());

-- ---------------------------------------------------------------------------
-- tramites_list_seen_state
-- ---------------------------------------------------------------------------

alter table public.tramites_list_seen_state enable row level security;

revoke all on table public.tramites_list_seen_state from anon, authenticated;

-- Políticas JWT opcionales (misma función portal_user_id() que arriba):
--
-- create policy tramites_list_seen_state_select_own
--   on public.tramites_list_seen_state
--   for select
--   to authenticated
--   using (user_id = public.portal_user_id());
--
-- create policy tramites_list_seen_state_insert_own
--   on public.tramites_list_seen_state
--   for insert
--   to authenticated
--   with check (user_id = public.portal_user_id());
--
-- create policy tramites_list_seen_state_update_own
--   on public.tramites_list_seen_state
--   for update
--   to authenticated
--   using (user_id = public.portal_user_id())
--   with check (user_id = public.portal_user_id());
--
-- create policy tramites_list_seen_state_delete_own
--   on public.tramites_list_seen_state
--   for delete
--   to authenticated
--   using (user_id = public.portal_user_id());
