'use client'

import { TramiteCreateIncidenciaButton } from '@/src/modules/tramites/ui/tramite-create-incidencia-button'
import { usePortalCreateIncidenciaOptional } from '@/src/modules/portal/ui/portal-create-incidencia-context'

export function PortalTopBarCreateIncidencia() {
  const createIncidencia = usePortalCreateIncidenciaOptional()

  if (!createIncidencia?.isAvailable) {
    return null
  }

  return (
    <TramiteCreateIncidenciaButton
      compact
      onOpen={createIncidencia.openCreateIncidencia}
      disabled={createIncidencia.isOpen}
    />
  )
}
