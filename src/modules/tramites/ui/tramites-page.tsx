import { Suspense } from 'react'

import { getTramitesForClient } from '@/src/modules/tramites/application/get-tramites-for-client'
import { getTramitesListSeenStateForUser } from '@/src/modules/tramites/application/get-tramites-list-seen-state'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  TramitesPageView,
  TramitesStateView,
} from '@/src/modules/tramites/ui/tramites-page-view'
import { tramites } from '@/content/tramites'

type TramitesPageProps = {
  user: PortalUser
}

export async function TramitesPage({ user }: TramitesPageProps) {
  const actorId = await resolveDirectoryActorId(user)
  const [tramitesResult, seenState] = await Promise.all([
    getTramitesForClient(user),
    getTramitesListSeenStateForUser(actorId),
  ])

  const result = tramitesResult

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
      <TramitesPageView data={result.data} seenState={seenState} />
    </Suspense>
  )
}
