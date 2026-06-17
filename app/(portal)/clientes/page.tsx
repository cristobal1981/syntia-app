import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { ClientsPage } from '@/src/modules/directory/ui/clients-page'

export default async function ClientesRoutePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'advisor') redirect('/dashboard')
  return <ClientsPage canAssignAdvisor={false} />
}
