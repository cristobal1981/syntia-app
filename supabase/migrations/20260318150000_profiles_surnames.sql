-- profiles: first_name + first_surname + second_surname (modelo nombre español)
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.profiles
  RENAME COLUMN last_name TO first_surname;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS second_surname text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.profiles.first_name IS 'Nombre(s) de pila.';
COMMENT ON COLUMN public.profiles.first_surname IS 'Primer apellido.';
COMMENT ON COLUMN public.profiles.second_surname IS 'Segundo apellido (opcional).';

-- Heurística: si first_surname tenía ambos apellidos juntos, separar el último token
UPDATE public.profiles p
SET
  second_surname = parts.last,
  first_surname = parts.first
FROM (
  SELECT
    user_id,
    CASE
      WHEN array_length(words, 1) >= 2 THEN
        array_to_string(words[1:array_length(words, 1) - 1], ' ')
      ELSE
        coalesce(words[1], '')
    END AS first,
    CASE
      WHEN array_length(words, 1) >= 2 THEN words[array_length(words, 1)]
      ELSE ''
    END AS last
  FROM (
    SELECT
      user_id,
      string_to_array(trim(first_surname), ' ') AS words
    FROM public.profiles
    WHERE trim(first_surname) LIKE '% %'
  ) split
) parts
WHERE p.user_id = parts.user_id;
