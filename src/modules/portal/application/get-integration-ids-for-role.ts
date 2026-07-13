import type { PortalRole } from '@/src/modules/auth/domain/types'
import type { IntegrationId } from '@/src/modules/portal/domain/types'

const INTEGRATIONS_BY_ROLE: Record<PortalRole, IntegrationId[]> = {
  client: [],
  admin: ['odoo', 'google', 'n8n'],
  advisor: ['odoo', 'google'],
}

export function getIntegrationIdsForRole(role: PortalRole): IntegrationId[] {
  return INTEGRATIONS_BY_ROLE[role]
}
