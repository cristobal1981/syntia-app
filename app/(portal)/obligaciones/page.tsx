import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { ObligacionesPage } from '@/src/modules/obligaciones/ui/obligaciones-page'

export default async function ObligacionesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <ObligacionesPage user={session.user} />
}
