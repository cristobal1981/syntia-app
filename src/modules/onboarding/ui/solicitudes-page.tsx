import { listOnboardingSolicitudesAction } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { SolicitudesPageView } from '@/src/modules/onboarding/ui/solicitudes-page-view'

export async function SolicitudesPage() {
  const solicitudesResult = await listOnboardingSolicitudesAction()
  const rows = solicitudesResult.ok ? solicitudesResult.rows : []

  return <SolicitudesPageView initialRows={rows} />
}
