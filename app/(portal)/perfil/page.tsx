import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getSession } from '@/src/modules/auth/application/get-session'
import { getAssignedAdvisorForClient } from '@/src/modules/profile/application/get-assigned-advisor-for-client'
import { getClientProfileForClient } from '@/src/modules/profile/application/get-client-profile-for-client'
import { ClientProfilePage } from '@/src/modules/profile/ui'
import { ProfileChangeDrawerProvider } from '@/src/modules/profile/ui/profile-change-drawer-state'
import { ProfilePageHeader } from '@/src/modules/profile/ui/profile-page-header'
import { ProfileStateView } from '@/src/modules/profile/ui/profile-state-view'
import { PerfilBodySkeleton } from '@/src/modules/portal/ui/skeletons'
import { listWorkersForOwner } from '@/src/modules/colaboradores/application/list-workers'
import { getWorkersFeatureForClient } from '@/src/modules/colaboradores/application/workers-feature-toggle'

/**
 * Pinta ya la cabecera y deja el perfil (que espera a Odoo, el asesor asignado
 * y los colaboradores) en streaming con su esqueleto.
 */
export default async function PerfilPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return (
    <ProfileChangeDrawerProvider>
      <div className="flex flex-col gap-6">
        <ProfilePageHeader />
        <Suspense fallback={<PerfilBodySkeleton />}>
          <PerfilContent user={session.user} />
        </Suspense>
      </div>
    </ProfileChangeDrawerProvider>
  )
}

async function PerfilContent({ user }: { user: PortalUser }) {
  const [result, assignedAdvisor, workersFeature, workers] = await Promise.all([
    getClientProfileForClient(user),
    getAssignedAdvisorForClient(user),
    getWorkersFeatureForClient(user),
    listWorkersForOwner(user),
  ])

  if (!result.ok) {
    return <ProfileStateView error={result.error} />
  }

  return (
    <ClientProfilePage
      initialProfile={result.profile}
      assignedAdvisor={assignedAdvisor}
      ownerEmail={user.email}
      workersEnabled={workersFeature.workers_enabled}
      maxWorkers={workersFeature.max_workers}
      workers={workers}
    />
  )
}
