import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { PortalShell } from '@/src/modules/portal/ui/portal-shell'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  return <PortalShell user={session.user}>{children}</PortalShell>
}
