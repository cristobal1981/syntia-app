import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { canAccessAutomatizacionesPage } from '@/src/modules/automatizaciones/application/get-nav-for-user'
import { AutomatizacionesPage } from '@/src/modules/automatizaciones/ui/automatizaciones-page'

export default async function AutomatizacionesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role === 'client') {
    redirect('/dashboard')
  }

  const canAccess = await canAccessAutomatizacionesPage(session.user)
  if (!canAccess) {
    redirect('/dashboard')
  }

  return <AutomatizacionesPage />
}
