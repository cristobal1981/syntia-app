import { getSession } from '@/src/modules/auth/application/get-session'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { FacturacionErrorCode } from '@/src/modules/facturacion/domain/types'
import { isFacturacionEnabled } from '@/src/modules/facturacion/infrastructure/facturacion-env'
import { getCachedClientOdooCompanyId } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type FacturacionAccess =
  | { ok: true; user: PortalUser; companyId: number }
  | { ok: false; error: FacturacionErrorCode; message?: string }

/**
 * Resuelve la company Odoo (tenant de facturación) del actor:
 * - `client`: su propia company (client_integrations.odoo_company_id).
 * - `advisor`: la del cliente indicado, solo si lo tiene asignado (profiles.advisor_id).
 * - `admin`: la del cliente indicado.
 */
export async function resolveFacturacionAccess(
  clientUserId?: string
): Promise<FacturacionAccess> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'unauthorized' }
  }

  if (!isFacturacionEnabled() || !isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const user = session.user

  if (user.role === 'client') {
    const actorId = await resolveDirectoryActorId(user)
    const companyId = await getCachedClientOdooCompanyId(actorId)
    if (!companyId) {
      return { ok: false, error: 'not_linked' }
    }
    return { ok: true, user, companyId }
  }

  if (!clientUserId) {
    return { ok: false, error: 'validation', message: 'Falta el cliente.' }
  }

  if (user.role === 'advisor') {
    const advisorId = await resolveDirectoryActorId(user)
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('advisor_id')
      .eq('user_id', clientUserId)
      .maybeSingle()

    if (error) {
      return { ok: false, error: 'odoo_unavailable' }
    }
    if (!data || data.advisor_id !== advisorId) {
      return { ok: false, error: 'forbidden' }
    }
  }

  const integration = await getClientIntegrationByUserId(clientUserId)
  const companyId = integration?.odoo_company_id
  if (typeof companyId !== 'number' || companyId <= 0) {
    return { ok: false, error: 'not_linked' }
  }

  return { ok: true, user, companyId }
}
