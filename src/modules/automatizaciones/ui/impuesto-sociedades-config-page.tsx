import { listImpuestoSociedadesConfigsAction } from '@/src/modules/automatizaciones/application/impuesto-sociedades-config-actions'
import { ImpuestoSociedadesConfigPageView } from '@/src/modules/automatizaciones/ui/impuesto-sociedades-config-page-view'

export async function ImpuestoSociedadesConfigPage() {
  const result = await listImpuestoSociedadesConfigsAction()
  const configured = result.ok ? result.data.configured : false
  const configs = result.ok ? result.data.configs : []

  return (
    <ImpuestoSociedadesConfigPageView
      initialConfigured={configured}
      initialConfigs={configs}
    />
  )
}
