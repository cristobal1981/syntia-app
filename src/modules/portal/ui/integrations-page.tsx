import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'
import { IntegrationsPageView } from '@/src/modules/portal/ui/integrations-page-view'

type IntegrationsPageProps = {
  user: PortalUser
}

export async function IntegrationsPage({ user }: IntegrationsPageProps) {
  const integrations = await getIntegrationsStatusForRole(user.role)

  return <IntegrationsPageView initialIntegrations={integrations} />
}
