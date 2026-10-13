import { getPendingSignaturesForClient } from '@/src/modules/firmas/application/get-pending-signatures-for-client'
import { getSignatureHistoryForClient } from '@/src/modules/firmas/application/get-signature-history-for-client'
import {
  FirmasPageView,
  FirmasStateView,
} from '@/src/modules/firmas/ui/firmas-page-view'
import { firmas } from '@/content/firmas'
import type { PortalUser } from '@/src/modules/auth/domain/types'

type FirmasPageProps = {
  user: PortalUser
}

export async function FirmasPage({ user }: FirmasPageProps) {
  const [result, historyResult] = await Promise.all([
    getPendingSignaturesForClient(user),
    getSignatureHistoryForClient(user),
  ])

  if (!result.ok) {
    const stateCopy = firmas.states
    if (result.error === 'not_linked') {
      return (
        <FirmasStateView
          title={stateCopy.notLinked.title}
          description={stateCopy.notLinked.description}
        />
      )
    }
    if (result.error === 'odoo_unavailable') {
      return (
        <FirmasStateView
          title={stateCopy.odooUnavailable.title}
          description={stateCopy.odooUnavailable.description}
          variant="destructive"
        />
      )
    }
    if (result.error === 'odoo_rate_limited') {
      return (
        <FirmasStateView
          title={stateCopy.odooRateLimited.title}
          description={stateCopy.odooRateLimited.description}
          variant="destructive"
        />
      )
    }
    return (
      <FirmasStateView
        title={stateCopy.forbidden.title}
        description={stateCopy.forbidden.description}
        variant="destructive"
      />
    )
  }

  const history = historyResult.ok ? historyResult.data : { requests: [] }

  return <FirmasPageView pending={result.data} history={history} />
}
