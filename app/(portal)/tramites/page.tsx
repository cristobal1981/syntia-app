import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { TramitesPage } from '@/src/modules/tramites/ui/tramites-page'

export default async function TramitesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/tramites')

  return <TramitesPage user={session.user} />
}
