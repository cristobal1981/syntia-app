import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  AdvisorHome,
  AdminHome,
  ClientHome,
} from '@/src/modules/portal/ui'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const { user } = session

  switch (user.role) {
    case 'client':
      return <ClientHome user={user} />
    case 'admin':
      return <AdminHome user={user} />
    case 'advisor':
      return <AdvisorHome user={user} />
    default:
      redirect('/login')
  }
}
