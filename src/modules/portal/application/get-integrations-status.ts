import type { PortalRole } from '@/src/modules/auth/domain/types'
import { getIntegrationIdsForRole } from '@/src/modules/portal/application/get-integration-ids-for-role'
import type {
  IntegrationConnectionStatus,
  IntegrationId,
  IntegrationStatus,
} from '@/src/modules/portal/domain/types'
import { checkGoogleIntegration } from '@/src/modules/portal/infrastructure/check-google-integration'
import { checkN8nHealth } from '@/src/modules/portal/infrastructure/check-n8n-health'
import { checkOdooHealth } from '@/src/modules/portal/infrastructure/check-odoo-health'

const INTEGRATION_LABELS: Record<IntegrationId, string> = {
  odoo: 'Odoo',
  google: 'Google Drive',
  n8n: 'n8n',
}

const LIVE_CHECK_IDS = new Set<IntegrationId>(['odoo', 'n8n', 'google'])

async function checkIntegrationStatus(
  id: IntegrationId
): Promise<IntegrationConnectionStatus> {
  switch (id) {
    case 'odoo':
      return checkOdooHealth()
    case 'n8n':
      return checkN8nHealth()
    case 'google':
      return checkGoogleIntegration()
  }
}

export async function getIntegrationsStatusForRole(
  role: PortalRole
): Promise<IntegrationStatus[]> {
  const ids = getIntegrationIdsForRole(role)

  return Promise.all(
    ids.map(async (id) => {
      const startedAt = performance.now()
      const status = await checkIntegrationStatus(id)
      const elapsed = Math.round(performance.now() - startedAt)

      return {
        id,
        name: INTEGRATION_LABELS[id],
        status,
        liveCheck: LIVE_CHECK_IDS.has(id),
        // Solo un ping que respondió bien mide algo: un error suele ser el timeout.
        latencyMs: status === 'connected' ? elapsed : null,
      }
    })
  )
}
