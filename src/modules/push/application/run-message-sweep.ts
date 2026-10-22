import {
  buildSweepPayloads,
  MODEL_TASK,
  type SweepMessage,
  type SweepTask,
  type SweepTicket,
} from '@/src/modules/push/domain/sweep-messages'
import {
  parsePortalEventPayload,
  type PortalEventInput,
} from '@/src/modules/push/domain/portal-event'

export type MessageSweepDeps = {
  getCursor: () => Promise<number | null>
  setCursor: (messageId: number) => Promise<void>
  /** Mayor id de mensaje anterior a `before` (foto inicial del cursor). */
  getMaxMessageId: (before: Date) => Promise<number>
  /** Mensajes públicos de tareas y tickets con id mayor que `afterId`, anteriores a `before`, de menor a mayor id. */
  fetchMessages: (afterId: number, before: Date, limit: number) => Promise<SweepMessage[]>
  /** Las tareas pedidas junto con todos sus ancestros. */
  fetchTasks: (ids: number[]) => Promise<Map<number, SweepTask>>
  fetchTickets: (ids: number[]) => Promise<Map<number, SweepTicket>>
  fetchProjectPartners: (projectIds: number[]) => Promise<Map<number, number | null>>
  insertEvent: (event: PortalEventInput) => Promise<'created' | 'duplicate'>
  now: () => number
  obligacionesPrefix: string
}

export type MessageSweepSummary = {
  /** Mensajes revisados. */
  scanned: number
  /** Eventos que faltaban y se han creado. */
  created: number
  /** Eventos que ya estaban (lo normal). */
  existing: number
  /** Mensajes que no deben avisar (no visibles, sin cliente…). */
  skipped: number
  /** Primera ejecución: se ha puesto el cursor sin revisar histórico. */
  baselined: boolean
  /** Quedan mensajes por revisar (se ha llegado al límite de páginas). */
  more: boolean
}

/**
 * Un mensaje espera este tiempo antes de revisarse: la acción de Odoo suele
 * entregarlo en segundos, y así el barrido solo recoge lo que de verdad se ha
 * perdido (aunque coincidieran, el `event_id` es idempotente).
 */
export const SWEEP_QUIET_MS = 10 * 60 * 1000

export const SWEEP_PAGE_SIZE = 200
export const SWEEP_MAX_PAGES = 5

/**
 * Reconciliación de mensajes: revisa los mensajes públicos nuevos de Odoo y crea
 * el evento de los que no llegaron (Syntia caída, error de la acción…). Un
 * cursor sobre el id del mensaje (que solo crece) evita ventanas de tiempo; el
 * cursor solo avanza tras guardar cada página, así que un fallo se reintenta.
 */
export async function runMessageSweep(deps: MessageSweepDeps): Promise<MessageSweepSummary> {
  const summary: MessageSweepSummary = {
    scanned: 0,
    created: 0,
    existing: 0,
    skipped: 0,
    baselined: false,
    more: false,
  }

  const before = new Date(deps.now() - SWEEP_QUIET_MS)
  let cursor = await deps.getCursor()

  if (cursor === null) {
    await deps.setCursor(await deps.getMaxMessageId(before))
    summary.baselined = true
    return summary
  }

  for (let page = 0; page < SWEEP_MAX_PAGES; page += 1) {
    const messages = await deps.fetchMessages(cursor, before, SWEEP_PAGE_SIZE)
    if (messages.length === 0) return summary

    const taskIds = unique(
      messages.filter((m) => m.model === MODEL_TASK).map((message) => message.resId)
    )
    const ticketIds = unique(
      messages.filter((m) => m.model !== MODEL_TASK).map((message) => message.resId)
    )

    const tasks = taskIds.length > 0 ? await deps.fetchTasks(taskIds) : new Map<number, SweepTask>()
    const tickets =
      ticketIds.length > 0 ? await deps.fetchTickets(ticketIds) : new Map<number, SweepTicket>()
    const projectIds = unique(
      [...tasks.values()]
        .map((task) => task.projectId)
        .filter((id): id is number => id !== null)
    )
    const projectPartners =
      projectIds.length > 0
        ? await deps.fetchProjectPartners(projectIds)
        : new Map<number, number | null>()

    const payloads = buildSweepPayloads({
      messages,
      tasks,
      tickets,
      projectPartners,
      obligacionesPrefix: deps.obligacionesPrefix,
    })

    let handled = 0
    for (const payload of payloads) {
      const parsed = parsePortalEventPayload(payload, {
        obligacionesPrefix: deps.obligacionesPrefix,
      })
      if (parsed.status !== 'ok') continue
      const result = await deps.insertEvent(parsed.event)
      handled += 1
      if (result === 'created') summary.created += 1
      else summary.existing += 1
    }

    summary.scanned += messages.length
    summary.skipped += messages.length - handled

    cursor = messages[messages.length - 1]!.id
    await deps.setCursor(cursor)

    if (messages.length < SWEEP_PAGE_SIZE) return summary
    if (page === SWEEP_MAX_PAGES - 1) summary.more = true
  }

  return summary
}

function unique(values: number[]): number[] {
  return [...new Set(values)]
}
