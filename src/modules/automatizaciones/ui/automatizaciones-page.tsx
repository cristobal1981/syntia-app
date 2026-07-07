import { listGestoresAction } from '@/src/modules/directory/application/directory-queries'
import {
  listAutomatizacionesAction,
  listAutomationsForAccessAdminAction,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions'
import { AutomatizacionesPageView } from '@/src/modules/automatizaciones/ui/automatizaciones-page-view'

export async function AutomatizacionesPage() {
  const [listResult, gestores] = await Promise.all([
    listAutomatizacionesAction(),
    listGestoresAction().catch(() => []),
  ])

  const configured = listResult.ok ? listResult.data.configured : false
  const automations = listResult.ok ? listResult.data.automations : []
  const isAdmin = listResult.ok ? listResult.data.isAdmin : false

  let adminAutomations = automations
  if (isAdmin) {
    const adminResult = await listAutomationsForAccessAdminAction()
    if (adminResult.ok) {
      adminAutomations = adminResult.data
    }
  }

  const advisorOptions = gestores.map((gestor) => ({
    id: gestor.id,
    name: gestor.name,
  }))

  return (
    <AutomatizacionesPageView
      initialConfigured={configured}
      initialAutomations={automations}
      isAdmin={isAdmin}
      adminAutomations={adminAutomations}
      advisorOptions={advisorOptions}
    />
  )
}
