import { unstable_cache } from 'next/cache'

import type { AdvisorPresenceStatus } from '@/src/modules/profile/domain/advisor-presence'
import { fetchAdvisorPresenceFromOdoo } from '@/src/modules/portal/infrastructure/odoo-advisor-presence'

/**
 * La presencia de un asesor es la misma para todos sus clientes: se pide a
 * Odoo una vez por minuto y por asesor, no una por cada cliente que abre o
 * vuelve a su perfil. Un error de Odoo no se cachea.
 */
export const ADVISOR_PRESENCE_REVALIDATE_SECONDS = 60

export async function getCachedAdvisorPresence(
  partnerId: number
): Promise<AdvisorPresenceStatus | null> {
  const cached = unstable_cache(
    () => fetchAdvisorPresenceFromOdoo(partnerId),
    ['advisor-presence', String(partnerId)],
    { revalidate: ADVISOR_PRESENCE_REVALIDATE_SECONDS }
  )

  return cached()
}
