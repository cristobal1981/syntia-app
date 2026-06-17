-- Nueva tabla users (portal) + relink profiles desde users_legacy + RLS.
-- Prerrequisito: users_legacy (ex users) y profiles ya creada.
-- Ejecutar en Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. users — cuenta del portal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  auth_user_id uuid UNIQUE
    REFERENCES auth.users (id) ON DELETE SET NULL,

  legacy_user_id text UNIQUE,

  email text NOT NULL,
  role text NOT NULL
    CHECK (role IN ('client', 'advisor', 'admin')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('active', 'invited')),
  is_active boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON public.users (lower(email));

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_role_idx
  ON public.users (role);

CREATE INDEX IF NOT EXISTS users_legacy_user_id_idx
  ON public.users (legacy_user_id)
  WHERE legacy_user_id IS NOT NULL;

COMMENT ON TABLE public.users IS 'Cuentas del portal Syntia.';
COMMENT ON COLUMN public.users.legacy_user_id IS 'ID Bubble (users_legacy.bubble_user_id) para trazabilidad.';
COMMENT ON COLUMN public.users.auth_user_id IS 'Enlace con auth.users (Supabase Auth).';

-- ---------------------------------------------------------------------------
-- 2. Backfill users desde users_legacy
-- ---------------------------------------------------------------------------
INSERT INTO public.users (
  legacy_user_id,
  email,
  role,
  status,
  is_active,
  created_at,
  updated_at
)
SELECT
  ul.bubble_user_id,
  lower(trim(ul.email)),
  CASE lower(coalesce(ul.rol, 'cliente'))
    WHEN 'cliente' THEN 'client'
    WHEN 'client' THEN 'client'
    WHEN 'gestor' THEN 'advisor'
    WHEN 'asesor' THEN 'advisor'
    WHEN 'advisor' THEN 'advisor'
    WHEN 'admin' THEN 'admin'
    WHEN 'administrador' THEN 'admin'
    ELSE 'client'
  END,
  CASE
    WHEN lower(coalesce(ul.estado, '')) = 'activo' THEN 'active'
    ELSE 'invited'
  END,
  coalesce(ul.is_active, false),
  coalesce(ul.created_at, now()),
  coalesce(ul.updated_at, now())
FROM public.users_legacy ul
WHERE ul.email IS NOT NULL
  AND trim(ul.email) <> ''
ON CONFLICT (legacy_user_id) DO NOTHING;

-- Sincronizar auth_user_id guardado en profiles (si existía)
UPDATE public.users u
SET auth_user_id = p.auth_user_id,
    updated_at = now()
FROM public.profiles p
WHERE p.auth_user_id IS NOT NULL
  AND u.legacy_user_id = p.user_id
  AND u.auth_user_id IS DISTINCT FROM p.auth_user_id;

-- ---------------------------------------------------------------------------
-- 3. Relink profiles → users (user_id / advisor_id: text legacy → uuid)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  DROP CONSTRAINT IF EXISTS profiles_advisor_id_fkey,
  DROP CONSTRAINT IF EXISTS profiles_pkey;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id_uuid uuid,
  ADD COLUMN IF NOT EXISTS advisor_id_uuid uuid;

UPDATE public.profiles p
SET user_id_uuid = u.id
FROM public.users u
WHERE u.legacy_user_id = p.user_id;

UPDATE public.profiles p
SET advisor_id_uuid = u.id
FROM public.users u
WHERE p.advisor_id IS NOT NULL
  AND u.legacy_user_id = p.advisor_id;

DELETE FROM public.profiles
WHERE user_id_uuid IS NULL;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS advisor_id,
  DROP COLUMN IF EXISTS auth_user_id;

ALTER TABLE public.profiles
  RENAME COLUMN user_id_uuid TO user_id;

ALTER TABLE public.profiles
  RENAME COLUMN advisor_id_uuid TO advisor_id;

ALTER TABLE public.profiles
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_advisor_id_fkey
    FOREIGN KEY (advisor_id) REFERENCES public.users (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. Helpers RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_portal_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_portal_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_portal_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_portal_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_portal_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_portal_user_role() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS — users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_select_advisor_clients ON public.users;
DROP POLICY IF EXISTS users_update_admin ON public.users;

CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY users_select_admin
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.current_portal_user_role() = 'admin');

CREATE POLICY users_select_advisor_clients
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.current_portal_user_role() = 'advisor'
    AND id IN (
      SELECT p.user_id
      FROM public.profiles p
      WHERE p.advisor_id = public.current_portal_user_id()
    )
  );

CREATE POLICY users_update_admin
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.current_portal_user_role() = 'admin')
  WITH CHECK (public.current_portal_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 6. RLS — profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_advisor_assigned ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_advisor_assigned ON public.profiles;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_id = public.current_portal_user_id());

CREATE POLICY profiles_select_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.current_portal_user_role() = 'admin');

CREATE POLICY profiles_select_advisor_assigned
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_portal_user_role() = 'advisor'
    AND advisor_id = public.current_portal_user_id()
  );

CREATE POLICY profiles_update_admin
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.current_portal_user_role() = 'admin')
  WITH CHECK (public.current_portal_user_role() = 'admin');

CREATE POLICY profiles_update_advisor_assigned
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.current_portal_user_role() = 'advisor'
    AND advisor_id = public.current_portal_user_id()
  )
  WITH CHECK (
    public.current_portal_user_role() = 'advisor'
    AND advisor_id = public.current_portal_user_id()
  );

-- ---------------------------------------------------------------------------
-- 7. Grants mínimos (escrituras vía service_role en server actions)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
