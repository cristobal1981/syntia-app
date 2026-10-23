import { Suspense } from 'react'

import { getObligacionesForClient } from '@/src/modules/obligaciones/application/get-obligaciones-for-client'
import {
  ObligacionesPageView,
  ObligacionesStateView,
} from '@/src/modules/obligaciones/ui/obligaciones-page-view'
import { ObligacionesPageHeader } from '@/src/modules/obligaciones/ui/obligaciones-page-header'
import { ObligacionesBodySkeleton } from '@/src/modules/portal/ui/skeletons'
import { obligaciones } from '@/content/obligaciones'
import type { PortalUser } from '@/src/modules/auth/domain/types'

type ObligacionesPageProps = {
  user: PortalUser
}

/**
 * Pinta ya la cabecera y deja el contenido (que espera al árbol de obligaciones,
 * Odoo si la caché está fría) en streaming con su esqueleto.
 */
export function ObligacionesPage({ user }: ObligacionesPageProps) {
  return (
    <div className="flex flex-col gap-8">
      <ObligacionesPageHeader />
      <Suspense fallback={<ObligacionesBodySkeleton />}>
        <ObligacionesPageContent user={user} />
      </Suspense>
    </div>
  )
}

async function ObligacionesPageContent({ user }: ObligacionesPageProps) {
  const result = await getObligacionesForClient(user)

  if (!result.ok) {
    const stateCopy = obligaciones.states
    if (result.error === 'not_linked') {
      return (
        <ObligacionesStateView
          title={stateCopy.notLinked.title}
          description={stateCopy.notLinked.description}
        />
      )
    }
    if (result.error === 'odoo_unavailable') {
      return (
        <ObligacionesStateView
          title={stateCopy.odooUnavailable.title}
          description={stateCopy.odooUnavailable.description}
          variant="destructive"
        />
      )
    }
    if (result.error === 'odoo_rate_limited') {
      return (
        <ObligacionesStateView
          title={stateCopy.odooRateLimited.title}
          description={stateCopy.odooRateLimited.description}
          variant="destructive"
        />
      )
    }
    return (
      <ObligacionesStateView
        title={stateCopy.forbidden.title}
        description={stateCopy.forbidden.description}
        variant="destructive"
      />
    )
  }

  return <ObligacionesPageView data={result.data} />
}
