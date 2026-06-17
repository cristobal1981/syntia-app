-- Portal: tabla profiles (gestión app) separada de users (cuenta) y perfiles (legacy Bubble).
-- Ejecutar en Supabase SQL Editor.

-- Revertir columnas añadidas por error a la tabla legacy
ALTER TABLE public.perfiles
  DROP COLUMN IF EXISTS odoo_partner_id,
  DROP COLUMN IF EXISTS gestor_id;

DROP INDEX IF EXISTS public.perfiles_gestor_id_idx;

-- Si se aplicó una versión anterior de esta migración con bubble_user_id:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'bubble_user_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN bubble_user_id TO user_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- profiles — datos extendidos del portal (lectura/escritura desde syntia-app)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id text PRIMARY KEY
    REFERENCES public.users (bubble_user_id) ON DELETE CASCADE,

  first_name text NOT NULL DEFAULT '',
  first_surname text NOT NULL DEFAULT '',
  second_surname text NOT NULL DEFAULT '',
  phone text,
  company_name text,

  -- Gestoría / Odoo
  advisor_id text
    REFERENCES public.users (bubble_user_id) ON DELETE SET NULL,
  odoo_partner_id integer,

  -- Fiscal / contacto (portal cliente y futuro sync)
  tax_id text,
  iban text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  province text,
  country char(2) NOT NULL DEFAULT 'ES',

  -- Integraciones futuras
  drive_folder_id text,
  auth_user_id uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_odoo_partner_id_positive
    CHECK (odoo_partner_id IS NULL OR odoo_partner_id > 0),
  CONSTRAINT profiles_country_iso2
    CHECK (country ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS profiles_advisor_id_idx
  ON public.profiles (advisor_id);

CREATE INDEX IF NOT EXISTS profiles_odoo_partner_id_idx
  ON public.profiles (odoo_partner_id)
  WHERE odoo_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_auth_user_id_idx
  ON public.profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON TABLE public.profiles IS 'Perfiles gestionados por el portal Syntia (extensiones sobre users).';
COMMENT ON COLUMN public.profiles.user_id IS 'FK a users (identificador de cuenta en el portal).';
COMMENT ON COLUMN public.profiles.advisor_id IS 'Gestor asignado (users con rol gestor/asesor).';
COMMENT ON COLUMN public.profiles.odoo_partner_id IS 'res.partner id en Odoo';
COMMENT ON COLUMN public.profiles.auth_user_id IS 'UUID en auth.users cuando exista enlace Supabase Auth';

-- Backfill desde perfiles legacy (solo filas con usuario existente)
INSERT INTO public.profiles (
  user_id,
  first_name,
  first_surname,
  second_surname,
  phone,
  company_name,
  created_at,
  updated_at
)
SELECT
  u.bubble_user_id,
  COALESCE(NULLIF(TRIM(p.nombre), ''), 'Sin nombre'),
  COALESCE(NULLIF(TRIM(p.apellido), ''), ''),
  '',
  NULLIF(NULLIF(TRIM(p.tel), ''), 'null'),
  NULLIF(NULLIF(TRIM(p."Nombre Empresa"), ''), 'null'),
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM public.perfiles p
INNER JOIN public.users u ON u.bubble_user_id = p.bubble_user_id
ON CONFLICT (user_id) DO NOTHING;
