import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/**
 * `odoo_partner_id` de todo cliente real dado de alta en el portal — usado
 * para detectar, sin ninguna llamada a Odoo, qué leads de la landing
 * acabaron siendo clientes de verdad independientemente de lo que diga su
 * `estado` (p. ej. un "rechazado" que siguió adelante por otra vía).
 */
export async function listConvertedOdooPartnerIds(): Promise<Set<number>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('client_integrations')
    .select('odoo_partner_id')
    .not('odoo_partner_id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(
    ((data ?? []) as { odoo_partner_id: number | null }[])
      .map((row) => row.odoo_partner_id)
      .filter((id): id is number => id != null)
  )
}
