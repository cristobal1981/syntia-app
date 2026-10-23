import { Suspense } from 'react'

import { getTramitesForClient } from '@/src/modules/tramites/application/get-tramites-for-client'
import { getTramitesListSeenStateForUser } from '@/src/modules/tramites/application/get-tramites-list-seen-state'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  TramitesPageHeader,
  TramitesPageView,
  TramitesStateView,
} from '@/src/modules/tramites/ui/tramites-page-view'
import { TramitesBodySkeleton } from '@/src/modules/portal/ui/skeletons'
import { tramites } from '@/content/tramites'

type TramitesPageProps = {
  user: PortalUser
}

/**
 * Pinta ya la cabecera y deja la lista (que espera a los snapshots, Odoo si la
 * caché está fría) en streaming con su esqueleto.
 */
export function TramitesPage({ user }: TramitesPageProps) {
  return (
    <div className="flex flex-col gap-8">
      <TramitesPageHeader />
      <Suspense fallback={<TramitesBodySkeleton />}>
        <TramitesPageContent user={user} />
      </Suspense>
    </div>
  )
}

/** Carga la lista de trámites y resuelve los estados de error de Odoo; los trabajadores escriben solo con la sección `/tramites`. */
async function TramitesPageContent({ user }: TramitesPageProps) {
  const actorId = await resolveDirectoryActorId(user)
  const [result, seenState, writeSections] = await Promise.all([
    getTramitesForClient(user),
    getTramitesListSeenStateForUser(actorId),
    user.role === 'worker' ? getWorkerWriteSections(user) : null,
  ])
  const canWriteTramites = user.role !== 'worker' || (writeSections?.has('/tramites') ?? false)

  if (!result.ok) {
    const stateCopy = tramites.states
    if (result.error === 'not_linked') {
      return (
        <TramitesStateView
          title={stateCopy.notLinked.title}
          description={stateCopy.notLinked.description}
        />
      )
    }
    if (result.error === 'forbidden') {
      return (
        <TramitesStateView
          title={stateCopy.forbidden.title}
          description={stateCopy.forbidden.description}
          variant="destructive"
        />
      )
    }
    if (result.error === 'odoo_rate_limited') {
      return (
        <TramitesStateView
          title={stateCopy.odooRateLimited.title}
          description={stateCopy.odooRateLimited.description}
        />
      )
    }
    return (
      <TramitesStateView
        title={stateCopy.odooUnavailable.title}
        description={stateCopy.odooUnavailable.description}
      />
    )
  }

  return (
    <Suspense fallback={null}>
      <TramitesPageView
        data={result.data}
        seenState={seenState}
        canWriteTramites={canWriteTramites}
      />
    </Suspense>
  )
}
