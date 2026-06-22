import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { TramitesPage } from '@/src/modules/tramites/ui/tramites-page'

export default async function TramitesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <TramitesPage user={session.user} />
}
