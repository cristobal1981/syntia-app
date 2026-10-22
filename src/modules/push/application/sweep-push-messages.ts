import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import {
  runMessageSweep,
  type MessageSweepDeps,
  type MessageSweepSummary,
} from '@/src/modules/push/application/run-message-sweep'
import { insertPortalEvent } from '@/src/modules/push/infrastructure/portal-events.supabase'
import {
  fetchMaxMessageId,
  fetchSweepMessages,
  fetchSweepProjectPartners,
  fetchSweepTasks,
  fetchSweepTickets,
} from '@/src/modules/push/infrastructure/odoo-message-sweep'
import { getSweepCursor, setSweepCursor } from '@/src/modules/push/infrastructure/sweep-state.supabase'

function productionDeps(): MessageSweepDeps {
  return {
    getCursor: getSweepCursor,
    setCursor: setSweepCursor,
    getMaxMessageId: fetchMaxMessageId,
    fetchMessages: fetchSweepMessages,
    fetchTasks: fetchSweepTasks,
    fetchTickets: fetchSweepTickets,
    fetchProjectPartners: fetchSweepProjectPartners,
    insertEvent: insertPortalEvent,
    now: () => Date.now(),
    obligacionesPrefix: getObligacionesParentPrefix(),
  }
}

/** Reconciliación de mensajes con Odoo: crea el evento de los que no llegaron. */
export function sweepPushMessages(): Promise<MessageSweepSummary> {
  return runMessageSweep(productionDeps())
}
