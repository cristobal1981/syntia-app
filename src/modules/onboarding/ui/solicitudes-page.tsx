import { listClientsAction } from '@/src/modules/directory/application/directory-queries'
import { listOnboardingSolicitudesAction } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { SolicitudesPageView } from '@/src/modules/onboarding/ui/solicitudes-page-view'

export async function SolicitudesPage() {
  const [clientsResult, solicitudesResult] = await Promise.all([
    listClientsAction(),
    listOnboardingSolicitudesAction(),
  ])

  const clients = Array.isArray(clientsResult) ? clientsResult : []
  const rows = solicitudesResult.ok ? solicitudesResult.rows : []

  return <SolicitudesPageView initialClients={clients} initialRows={rows} />
}
