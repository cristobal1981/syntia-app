import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { LeadsPage } from '@/src/modules/leads/ui/leads-page'

export default async function OportunidadesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <LeadsPage />
}
