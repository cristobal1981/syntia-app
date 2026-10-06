import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

type IntegrationRow = {
  user_id: string
  odoo_partner_id: number | null
}

type UserRow = {
  id: string
  email: string | null
  is_active: boolean | null
  role: string | null
}

type EligibleRecipient = {
  email: string
  role: string | null
}

/**
 * Mapea `odoo_partner_id` → emails a avisar, para el cron de recordatorios
 * (que solo tiene partner ids de Odoo, no user ids). Descarta usuarios
 * inactivos (`is_active = false`) y usuarios sin email.
 *
 * Un partner_id puede tener varias filas en `client_integrations`: el
 * cliente dueño (`role: 'client'`) y, si delegó acceso, sus colaboradores
 * (`role: 'worker'`, ver `propagateOwnerIntegrationToWorkers`) — todos con
 * el mismo `odoo_partner_id`. Regla: el dueño manda. Si el dueño no puede
 * recibir correo (inactivo, sin email, o no existe esa fila), NINGÚN
 * colaborador suyo recibe el aviso tampoco, aunque su propia fila esté
 * activa — nunca se avisa a un colaborador "en nombre de" un cliente al
 * que no se le avisaría directamente.
 */
export async function resolveClientEmailsByPartnerIds(
  partnerIds: number[]
): Promise<Map<number, string[]>> {
  if (!partnerIds.length) return new Map()

  const supabase = createSupabaseAdminClient()

  const { data: integrations, error: integrationsError } = await supabase
    .from('client_integrations')
    .select('user_id, odoo_partner_id')
    .in('odoo_partner_id', partnerIds)

  if (integrationsError) {
    throw new Error(integrationsError.message)
  }

  const partnerIdByUserId = new Map<string, number>()
  for (const row of (integrations ?? []) as IntegrationRow[]) {
    if (typeof row.odoo_partner_id === 'number') {
      partnerIdByUserId.set(row.user_id, row.odoo_partner_id)
    }
  }
  if (!partnerIdByUserId.size) return new Map()

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, is_active, role')
    .in('id', [...partnerIdByUserId.keys()])

  if (usersError) {
    throw new Error(usersError.message)
  }

  const eligibleByPartnerId = new Map<number, EligibleRecipient[]>()
  for (const user of (users ?? []) as UserRow[]) {
    if (user.is_active === false || !user.email) continue
    const partnerId = partnerIdByUserId.get(user.id)
    if (partnerId === undefined) continue

    const list = eligibleByPartnerId.get(partnerId) ?? []
    list.push({ email: user.email, role: user.role })
    eligibleByPartnerId.set(partnerId, list)
  }

  const result = new Map<number, string[]>()
  for (const [partnerId, eligible] of eligibleByPartnerId) {
    const ownerIsEligible = eligible.some((entry) => entry.role === 'client')
    if (!ownerIsEligible) continue

    const emails = eligible
      .filter((entry) => entry.role === 'client' || entry.role === 'worker')
      .map((entry) => entry.email)
    if (emails.length) {
      result.set(partnerId, emails)
    }
  }

  return result
}
