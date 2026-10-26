import { Suspense } from 'react'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { getClientHomeData } from '@/src/modules/portal/application/get-client-home-data'
import { ClientHomeDashboard } from '@/src/modules/portal/ui/client-home-dashboard'
import {
  ClientHomeGreeting,
  ClientHomeQuickLinksSection,
  QUICK_LINKS,
} from '@/src/modules/portal/ui/client-home-static'
import { PushPromptBanner } from '@/src/modules/push/ui/push-prompt-banner'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'
import {
  ClientHomeDashboardSkeleton,
  ClientHomeQuickLinksSkeleton,
} from '@/src/modules/portal/ui/skeletons'

type ClientHomeProps = {
  user: PortalUser
  /** Bajo la «vista como cliente» no se ofrece activar notificaciones: son del cliente, no de quien mira. */
  showPushPrompt?: boolean
}

/**
 * Pinta ya el saludo y los accesos rápidos (un cliente los tiene todos; un
 * colaborador espera a sus permisos) y deja en streaming solo lo que depende de
 * los snapshots: el resumen y las novedades.
 */
export function ClientHome({ user, showPushPrompt = false }: ClientHomeProps) {
  return (
    <div className="flex flex-col gap-8">
      <ClientHomeGreeting name={user.name} companyName={user.companyName} />

      {showPushPrompt ? <PushPromptBanner userId={user.id} /> : null}

      <Suspense fallback={<ClientHomeDashboardSkeleton />}>
        <ClientHomeDashboardSection user={user} />
      </Suspense>

      {user.role === 'worker' ? (
        <Suspense fallback={<ClientHomeQuickLinksSkeleton />}>
          <WorkerQuickLinks user={user} />
        </Suspense>
      ) : (
        <ClientHomeQuickLinksSection links={QUICK_LINKS} />
      )}
    </div>
  )
}

async function ClientHomeDashboardSection({ user }: ClientHomeProps) {
  const [homeData, allowedSections] = await Promise.all([
    getClientHomeData(user),
    user.role === 'worker' ? getAllowedSectionsForWorker(user) : null,
  ])

  return (
    <>
      <ClientHomeDashboard
        role={user.role}
        allowedSections={allowedSections ?? undefined}
        snapshot={homeData.snapshot}
        snapshotError={homeData.snapshotError}
        initialNotifications={homeData.notifications}
      />
      <PortalDashboardReady />
    </>
  )
}

async function WorkerQuickLinks({ user }: ClientHomeProps) {
  const allowedSections = await getAllowedSectionsForWorker(user)

  return (
    <ClientHomeQuickLinksSection
      links={QUICK_LINKS.filter((link) => allowedSections.has(link.href))}
    />
  )
}
