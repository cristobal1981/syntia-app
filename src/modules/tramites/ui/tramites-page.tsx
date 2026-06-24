import { Suspense } from 'react'

import { getTramitesForClient } from '@/src/modules/tramites/application/get-tramites-for-client'
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
  const result = await getTramitesForClient(user)

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
    return (
      <TramitesStateView
        title={stateCopy.odooUnavailable.title}
        description={stateCopy.odooUnavailable.description}
      />
    )
  }

  return (
    <Suspense fallback={null}>
      <TramitesPageView data={result.data} />
    </Suspense>
  )
}
