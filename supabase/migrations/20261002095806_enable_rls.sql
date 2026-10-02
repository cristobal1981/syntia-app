-- Habilita Row Level Security en todas las tablas de negocio que usa
-- syntia-app, como defensa en profundidad.
--
-- CONTEXTO IMPORTANTE: hoy el 100% de las queries de la app pasan por
-- `createSupabaseAdminClient()` (SUPABASE_SERVICE_ROLE_KEY), que ignora RLS
-- por diseño de Supabase. Esta migración NO cambia el comportamiento actual
-- de la app ni requiere ningún cambio de código — es una red de seguridad
-- para el día en que alguien añada una query desde el navegador o con el
-- cliente autenticado (anon/`authenticated`), que hoy ya no debería ver
-- nada salvo lo explícitamente permitido abajo.
--
-- Verificado empíricamente antes de escribir esto (vía REST API con la
-- anon key) que ninguna de estas tablas expone datos a `anon` hoy: o ya
-- tienen RLS activo sin políticas (devuelven array vacío), o no tienen
-- siquiera GRANT a anon (devuelven 42501 permission denied). Esta
-- migración documenta y fija ese estado explícitamente en vez de dejarlo
-- implícito/accidental.
--
-- No se añaden políticas de INSERT/UPDATE/DELETE para `authenticated`: la
-- app nunca escribe por esa vía (siempre service_role via Server Actions),
-- así que no hay ningún camino de escritura real que proteger todavía —
-- añadir políticas de escritura sin uso real sería defensa especulativa.

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.client_integrations enable row level security;
alter table public.worker_grants enable row level security;
alter table public.portal_record_watch_state enable row level security;
alter table public.tramites_list_seen_state enable row level security;
alter table public.chatter_read_state enable row level security;
alter table public.portal_automation_user_order enable row level security;
alter table public.portal_automation_runs enable row level security;
alter table public.portal_automations enable row level security;
alter table public.portal_chatter_reply_links enable row level security;
alter table public.landing_autonomo_leads enable row level security;
alter table public.landing_autonomo_lead_contacts enable row level security;
alter table public.onboarding_form_access_tokens enable row level security;
alter table public.config_impuesto_sociedades enable row level security;

-- --------------------------------------------------------------------
-- Políticas de SELECT para `authenticated`, en tablas con una columna
-- de propiedad clara (user_id / advisor_id / etc). El resto de tablas
-- (portal_automations, portal_chatter_reply_links, landing_autonomo_*,
-- onboarding_form_access_tokens, config_impuesto_sociedades) se dejan
-- con RLS activo y SIN políticas a propósito: o son datos globales/solo
-- de equipo interno sin una columna de usuario natural, o son datos de
-- pipeline (leads, tokens de onboarding público) que no debe leer
-- directamente ningún usuario autenticado del portal. "Sin políticas"
-- con RLS activo significa deny-all, que es el comportamiento actual.
-- --------------------------------------------------------------------

-- users: cada usuario autenticado solo ve su propia fila.
create policy "users_select_self"
  on public.users
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- profiles: el cliente ve su propio perfil; el asesor asignado ve el de
-- sus clientes. No cubre el acceso de un worker/colaborador vía
-- worker_grants — no hay hoy ningún camino de código que lo necesite.
create policy "profiles_select_self_or_advisor"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = (select id from public.users where auth_user_id = auth.uid())
    or advisor_id = (select id from public.users where auth_user_id = auth.uid())
  );

-- client_integrations: el propio cliente ve su vínculo con Odoo/Drive.
create policy "client_integrations_select_self"
  on public.client_integrations
  for select
  to authenticated
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

-- worker_grants: el worker ve su propio grant; el titular (owner) ve los
-- grants que ha concedido.
create policy "worker_grants_select_self_or_owner"
  on public.worker_grants
  for select
  to authenticated
  using (
    worker_user_id = (select id from public.users where auth_user_id = auth.uid())
    or owner_user_id = (select id from public.users where auth_user_id = auth.uid())
  );

-- portal_record_watch_state / tramites_list_seen_state / chatter_read_state
-- / portal_automation_user_order / portal_automation_runs: estado de UI
-- por usuario, cada uno ve solo el suyo.
create policy "portal_record_watch_state_select_self"
  on public.portal_record_watch_state
  for select
  to authenticated
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy "tramites_list_seen_state_select_self"
  on public.tramites_list_seen_state
  for select
  to authenticated
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy "chatter_read_state_select_self"
  on public.chatter_read_state
  for select
  to authenticated
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy "portal_automation_user_order_select_self"
  on public.portal_automation_user_order
  for select
  to authenticated
  using (user_id = (select id from public.users where auth_user_id = auth.uid()));

create policy "portal_automation_runs_select_own"
  on public.portal_automation_runs
  for select
  to authenticated
  using (triggered_by = (select id from public.users where auth_user_id = auth.uid()));
