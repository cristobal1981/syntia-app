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

  const navTokens = listResult.ok
    ? listResult.rows.map((row) => row.token)
    : []

  return <SolicitudDetailView initialRow={detailResult.row} navTokens={navTokens} />
}
