import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { FirmasPage } from '@/src/modules/firmas/ui/firmas-page'

export default async function FirmasRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <FirmasPage user={session.user} />
}
