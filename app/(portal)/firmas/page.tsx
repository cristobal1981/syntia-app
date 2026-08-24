import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { FirmasPage } from '@/src/modules/firmas/ui/firmas-page'

export default async function FirmasRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/firmas')

  return <FirmasPage user={session.user} />
}
