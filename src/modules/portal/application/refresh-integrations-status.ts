'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import type { IntegrationStatus } from '@/src/modules/portal/domain/types'

export type RefreshIntegrationsResult =
  | { ok: true; integrations: IntegrationStatus[] }
  | { ok: false; error: 'unauthorized' }

export async function refreshIntegrationsStatusAction(): Promise<RefreshIntegrationsResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'unauthorized' }
  }

  const { role } = session.user
  if (role === 'client') {
    return { ok: false, error: 'unauthorized' }
  }

  const integrations = await getIntegrationsStatusForRole(role)
  return { ok: true, integrations }
}
