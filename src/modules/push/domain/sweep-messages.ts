import { parseOdooDateTime } from '@/src/modules/tramites/domain/parse-odoo-datetime'

export const MODEL_TASK = 'project.task'

export type SweepMessage = {
  id: number
  model: string
  resId: number
  body: string
  authorId: number | null
  /** `YYYY-MM-DD HH:MM:SS` (UTC), tal y como lo da Odoo. */
  date: string
}

export type SweepTask = {
  id: number
  name: string
  parentId: number | null
  projectId: number | null
  partnerId: number | null
  /** `x_studio_mostrar_en_syntia`. */
  showInSyntia: boolean
}

export type SweepTicket = {
  id: number
  name: string
  partnerId: number | null
}

/** Cuántos niveles de tareas padre se recorren (igual que la acción de Odoo). */
const MAX_DEPTH = 10

/**
 * Reproduce, desde los datos de Odoo, el cuerpo que mandaría la acción
 * automatizada de Odoo para cada mensaje (mismas reglas de visibilidad, mismo
 * cliente y mismo autor). Los mensajes que no deben avisar (tarea no visible,
 * sin cliente, registro desconocido o con la cadena de padres incompleta) no
 * salen. El resultado se pasa por `parsePortalEventPayload`, igual que el
 * webhook, así que ámbito, título y extracto se calculan con las mismas reglas.
 */
export function buildSweepPayloads(input: {
  messages: SweepMessage[]
  tasks: ReadonlyMap<number, SweepTask>
  tickets: ReadonlyMap<number, SweepTicket>
  /** Cliente de cada proyecto (`project.project.partner_id`). */
  projectPartners: ReadonlyMap<number, number | null>
  obligacionesPrefix: string
}): Record<string, unknown>[] {
  const payloads: Record<string, unknown>[] = []

  for (const message of input.messages) {
    const base = {
      event_id: `msg:${message.id}`,
      kind: 'message',
      message_id: message.id,
      message_body: message.body,
      occurred_at: parseOdooDateTime(message.date),
    }

    if (message.model === MODEL_TASK) {
      const task = input.tasks.get(message.resId)
      if (!task) continue

      const ancestors: SweepTask[] = []
      let cursor = task.parentId === null ? undefined : input.tasks.get(task.parentId)
      let incomplete = task.parentId !== null && cursor === undefined
      for (let depth = 0; cursor && depth < MAX_DEPTH; depth += 1) {
        ancestors.unshift(cursor)
        if (cursor.parentId === null) break
        const next = input.tasks.get(cursor.parentId)
        if (!next) incomplete = true
        cursor = next
      }
      if (incomplete) continue

      const rootName = ancestors[0]?.name ?? task.name
      const visible =
        rootName.startsWith(input.obligacionesPrefix) ||
        task.showInSyntia ||
        ancestors.some((ancestor) => ancestor.showInSyntia)
      if (!visible) continue

      const projectPartner =
        task.projectId === null ? null : (input.projectPartners.get(task.projectId) ?? null)
      const partnerId = projectPartner ?? task.partnerId
      if (partnerId === null) continue

      payloads.push({
        ...base,
        model: MODEL_TASK,
        record_id: task.id,
        record_name: task.name,
        ancestor_names: ancestors.map((ancestor) => ancestor.name),
        partner_id: partnerId,
        by_client: message.authorId === partnerId,
      })
      continue
    }

    const ticket = input.tickets.get(message.resId)
    if (!ticket || ticket.partnerId === null) continue

    payloads.push({
      ...base,
      model: message.model,
      record_id: ticket.id,
      record_name: ticket.name,
      ancestor_names: [],
      partner_id: ticket.partnerId,
      by_client: message.authorId === ticket.partnerId,
    })
  }

  return payloads
}
