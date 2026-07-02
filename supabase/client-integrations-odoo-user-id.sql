-- IDs Odoo en `client_integrations` (una fila por cliente).
--   odoo_partner_id → res.partner del cliente (author en chatter / APIs portal)
--   odoo_user_id    → res.users del asesor asignado (asignación tarea/ticket)
--
-- El portal resuelve partner del asesor para notificar vía res.users → partner_id (cache).
--
-- Ejemplo:
--   UPDATE client_integrations
--   SET odoo_partner_id = 101,
--       odoo_user_id = 12
--   WHERE user_id = '<uuid-cliente>';

ALTER TABLE public.client_integrations
  ADD COLUMN IF NOT EXISTS odoo_user_id integer;

COMMENT ON COLUMN public.client_integrations.odoo_user_id IS
  'res.users.id del asesor asignado al cliente (asignación en Odoo).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_integrations_odoo_user_id_positive'
  ) THEN
    ALTER TABLE public.client_integrations
      ADD CONSTRAINT client_integrations_odoo_user_id_positive
      CHECK (odoo_user_id IS NULL OR odoo_user_id > 0);
  END IF;
END $$;
