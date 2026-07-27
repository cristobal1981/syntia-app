import { notFound } from 'next/navigation'

import { getOnboardingSolicitudDetailAction } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { SolicitudDetailView } from '@/src/modules/onboarding/ui/solicitud-detail-view'

type SolicitudDetailPageProps = {
  token: string
}

export async function SolicitudDetailPage({ token }: SolicitudDetailPageProps) {
  const result = await getOnboardingSolicitudDetailAction(token)
  if (!result.ok) {
    notFound()
  }

  return <SolicitudDetailView initialRow={result.row} />
}
