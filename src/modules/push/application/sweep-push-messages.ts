import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import {
  runMessageSweep,
  type MessageSweepDeps,
  type MessageSweepSummary,
} from '@/src/modules/push/application/run-message-sweep'
import {
  runFirmaDueSweep,
  type FirmaDueSweepSummary,
} from '@/src/modules/push/application/run-firma-due-sweep'
import { fetchDueSoonSignItems } from '@/src/modules/push/infrastructure/odoo-firma-due-sweep'
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

/** «Una firma vence pronto» por eventos: es por fecha, así que lo crea el barrido. */
export function sweepPushFirmaDueSoon(): Promise<FirmaDueSweepSummary> {
  return runFirmaDueSweep({
    fetchDueSoonItems: () => fetchDueSoonSignItems(),
    insertEvent: insertPortalEvent,
    now: () => Date.now(),
    obligacionesPrefix: getObligacionesParentPrefix(),
  })
}
