import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'
import { getNavForUser } from '@/src/modules/automatizaciones/application/get-nav-for-user'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import { PortalShell } from '@/src/modules/portal/ui/portal-shell'
import { PortalPageSkeletonBody } from '@/src/modules/portal/ui/skeletons'

/**
 * Con Cache Components la sesión (cookies) es dato de request: el layout solo
 * puede pintar un marco estático y la sesión se resuelve dentro de Suspense.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PortalPageSkeletonBody />}>
      <PortalSessionShell>{children}</PortalSessionShell>
    </Suspense>
  )
}

async function PortalSessionShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const navItems = await getNavForUser(session.user)
  const workerWriteSections =
    session.user.role === 'worker'
      ? [...(await getWorkerWriteSections(session.user))]
      : undefined

  // `key` por usuario: con Cache Components el portal se conserva oculto al salir a /login, y sin
  // ella el siguiente usuario hereda el estado de los proveedores del anterior (estadísticas,
  // avisos, conversaciones) hasta recargar a mano.
  return (
    <PortalShell
      key={session.user.id}
      user={session.user}
      navItems={navItems}
      workerWriteSections={workerWriteSections}
      viewingAs={
        session.viewingAs
          ? { clientName: session.user.companyName || session.user.name }
          : undefined
      }
    >
      {children}
    </PortalShell>
  )
}
