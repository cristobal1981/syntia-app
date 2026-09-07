import { notFound } from 'next/navigation'

import {
  getOnboardingSolicitudDetailAction,
  listOnboardingSolicitudesAction,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { SolicitudDetailView } from '@/src/modules/onboarding/ui/solicitud-detail-view'

type SolicitudDetailPageProps = {
  token: string
}

export async function SolicitudDetailPage({ token }: SolicitudDetailPageProps) {
  const [detailResult, listResult] = await Promise.all([
    getOnboardingSolicitudDetailAction(token),
    listOnboardingSolicitudesAction(),
  ])
  if (!detailResult.ok) {
    notFound()
  }

  // El anterior/siguiente navega solo dentro del mismo bloque que la
  // solicitud actual (pendiente vs. cerrada) para que sea coherente con las
  // pestañas de la lista: nunca salta de una activa a una ya cerrada.
  const isPending = detailResult.row.status === 'active'
  const navTokens = listResult.ok
    ? listResult.rows
        .filter((row) => (isPending ? row.status === 'active' : row.status !== 'active'))
        .map((row) => row.token)
    : []

  return <SolicitudDetailView initialRow={detailResult.row} navTokens={navTokens} />
}
