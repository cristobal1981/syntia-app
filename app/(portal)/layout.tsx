import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { getNavForUser } from '@/src/modules/automatizaciones/application/get-nav-for-user'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
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

  const navItems = await getNavForUser(session.user)
  const workerWriteSections =
    session.user.role === 'worker'
      ? [...(await getWorkerWriteSections(session.user))]
      : undefined

  return (
    <PortalShell
      user={session.user}
      navItems={navItems}
      workerWriteSections={workerWriteSections}
    >
      {children}
    </PortalShell>
  )
}
