import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { SolicitudDetailPage } from '@/src/modules/onboarding/ui/solicitud-detail-page'

type SolicitudDetailRoutePageProps = {
  params: Promise<{ token: string }>
}

export default async function SolicitudDetailRoutePage({
  params,
}: SolicitudDetailRoutePageProps) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { token } = await params
  return <SolicitudDetailPage token={token} />
}
