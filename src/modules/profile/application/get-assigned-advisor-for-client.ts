import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { AssignedAdvisor } from '@/src/modules/profile/domain/types'
import { fetchAssignedAdvisorSourceForClient } from '@/src/modules/profile/infrastructure/assigned-advisor.supabase'
import { getCachedAdvisorPartnerIdByEmail } from '@/src/modules/portal/infrastructure/cached-partner-avatar'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

export async function getAssignedAdvisorForClient(
  user: PortalUser
): Promise<AssignedAdvisor | null> {
  if (user.role !== 'client') return null

  let portalUserId: string
  try {
    portalUserId = await resolveDirectoryActorId(user)
  } catch {
    return null
  }

  let source
  try {
    source = await fetchAssignedAdvisorSourceForClient(portalUserId)
  } catch {
    return null
  }

  if (!source) return null

  let partnerId: number | undefined
  if (isOdooApiConfigured()) {
    try {
      const resolved = await getCachedAdvisorPartnerIdByEmail(source.email)
      if (resolved) partnerId = resolved
    } catch {
      // Sin foto en Odoo: mostramos nombre igual.
    }
  }

  return {
    name: source.name,
    ...(partnerId ? { partnerId } : {}),
  }
}
