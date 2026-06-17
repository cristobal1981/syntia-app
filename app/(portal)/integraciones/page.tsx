import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { IntegrationsPage } from '@/src/modules/portal/ui/integrations-page'

export default async function IntegracionesRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <IntegrationsPage user={session.user} />
}
