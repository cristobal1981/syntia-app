import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { SolicitudesPage } from '@/src/modules/onboarding/ui/solicitudes-page'

export default async function SolicitudesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <SolicitudesPage />
}
