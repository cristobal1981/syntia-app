import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { filterNotificationsForWorker } from '@/src/modules/colaboradores/application/mask-dashboard-for-worker'
import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import { getCachedClientOdooPartnerId } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  runPushDispatch,
  type PushDispatchDeps,
  type PushDispatchSummary,
} from '@/src/modules/push/application/run-push-dispatch'
import {
  deletePushSubscriptionsByIds,
  fetchPushRecipients,
  listPushSubscriptions,
  savePushDispatchState,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'
import { sendWebPush } from '@/src/modules/push/infrastructure/web-push-sender'

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

const productionDeps: PushDispatchDeps = {
  listSubscriptions: listPushSubscriptions,
  fetchRecipients: fetchPushRecipients,
  async loadNotifications(userId, recipient) {
    const partnerId = await getCachedClientOdooPartnerId(userId)
    if (!partnerId) return null

    // `cache: true`: reutiliza los snapshots de Odoo ya calientes (los que pide
    // el sondeo del propio cliente) en vez de repetir las peticiones.
    // `persist: false`: no avanza el «visto» del usuario; eso solo lo hace él.
    const result = await loadClientPortalNotifications({
      partnerId,
      actorId: userId,
      cache: true,
      persist: false,
    })
    if (!result.ok) return null

    if (recipient.role !== 'worker') return result.unread

    if (!recipient.authUserId) return null
    const user: PortalUser = {
      id: recipient.authUserId,
      email: recipient.email,
      name: '',
      role: 'worker',
    }
    const sections = await getAllowedSectionsForWorker(user)
    return filterNotificationsForWorker(result.unread, sections)
  },
  send: (subscription, payload) => sendWebPush(subscription, payload),
  saveState: savePushDispatchState,
  deleteByIds: deletePushSubscriptionsByIds,
  now: () => Date.now(),
  order: shuffled,
}

/** Margen bajo el límite de la función para poder responder antes de que la corten. */
const RUN_BUDGET_MS = 45_000

export function dispatchPushNotifications(): Promise<PushDispatchSummary> {
  return runPushDispatch(productionDeps, {
    deadlineAt: Date.now() + RUN_BUDGET_MS,
  })
}
