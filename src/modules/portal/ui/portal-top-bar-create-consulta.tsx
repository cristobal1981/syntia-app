'use client'

import { TramiteCreateConsultaButton } from '@/src/modules/tramites/ui/tramite-create-consulta-button'
import { usePortalCreateConsultaOptional } from '@/src/modules/portal/ui/portal-create-consulta-context'

export function PortalTopBarCreateConsulta() {
  const createConsulta = usePortalCreateConsultaOptional()

  if (!createConsulta?.isAvailable) {
    return null
  }

  return (
    <TramiteCreateConsultaButton
      compact
      onOpen={createConsulta.openCreateConsulta}
      disabled={createConsulta.isOpen}
    />
  )
}
