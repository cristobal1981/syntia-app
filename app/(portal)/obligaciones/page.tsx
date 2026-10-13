import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { ObligacionesPage } from '@/src/modules/obligaciones/ui/obligaciones-page'

export default async function ObligacionesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/obligaciones')

  return <ObligacionesPage user={session.user} />
}
