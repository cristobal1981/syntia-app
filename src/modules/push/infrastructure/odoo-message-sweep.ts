import { odooSearchRead, mapOdooMany2OneId } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { TRAMITES_SHOW_IN_SYNTIA_FIELD, getOdooTicketsModel } from '@/src/modules/tramites/infrastructure/tramites-env'
import {
  MODEL_TASK,
  type SweepMessage,
  type SweepTask,
  type SweepTicket,
} from '@/src/modules/push/domain/sweep-messages'

/** Niveles de tareas padre que se recorren (igual que la acción de Odoo). */
const MAX_ANCESTOR_ROUNDS = 10

type Many2One = [number, string] | false | null | undefined

type MessageRow = {
  id: number
  model?: string | false
  res_id?: number | false
  body?: string | false
  author_id?: Many2One
  date?: string | false
}

type TaskRow = {
  id: number
  name?: string | false
  parent_id?: Many2One
  project_id?: Many2One
  partner_id?: Many2One
  [key: string]: unknown
}

/** `YYYY-MM-DD HH:MM:SS` en UTC, el formato de fecha de Odoo. */
export function toOdooDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/** Mensajes públicos (comentarios) de tareas y tickets, que son los que avisan. */
function messageDomain(extra: unknown[]): unknown[] {
  return [
    ['model', 'in', [MODEL_TASK, getOdooTicketsModel()]],
    ['message_type', '=', 'comment'],
    ['subtype_id.internal', '=', false],
    ...extra,
  ]
}

export async function fetchMaxMessageId(before: Date): Promise<number> {
  const rows = await odooSearchRead<{ id: number }>('mail.message', {
    domain: [['date', '<', toOdooDateTime(before)]],
    fields: ['id'],
    order: 'id desc',
    limit: 1,
  })
  return rows[0]?.id ?? 0
}

export async function fetchSweepMessages(
  afterId: number,
  before: Date,
  limit: number
): Promise<SweepMessage[]> {
  const rows = await odooSearchRead<MessageRow>('mail.message', {
    domain: messageDomain([
      ['id', '>', afterId],
      ['date', '<', toOdooDateTime(before)],
    ]),
    fields: ['id', 'model', 'res_id', 'body', 'author_id', 'date'],
    order: 'id asc',
    limit,
  })

  return rows.flatMap((row) => {
    if (typeof row.model !== 'string' || typeof row.res_id !== 'number' || !row.res_id) return []
    return [
      {
        id: row.id,
        model: row.model,
        resId: row.res_id,
        body: typeof row.body === 'string' ? row.body : '',
        authorId: mapOdooMany2OneId(row.author_id) ?? null,
        date: typeof row.date === 'string' ? row.date : '',
      },
    ]
  })
}

function mapTask(row: TaskRow): SweepTask {
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    parentId: mapOdooMany2OneId(row.parent_id) ?? null,
    projectId: mapOdooMany2OneId(row.project_id) ?? null,
    partnerId: mapOdooMany2OneId(row.partner_id) ?? null,
    showInSyntia: row[TRAMITES_SHOW_IN_SYNTIA_FIELD] === true,
  }
}

/** Las tareas pedidas y todos sus ancestros, subiendo por `parent_id` en lotes. */
export async function fetchSweepTasks(ids: number[]): Promise<Map<number, SweepTask>> {
  const tasks = new Map<number, SweepTask>()
  let pending = [...new Set(ids)]

  for (let round = 0; round < MAX_ANCESTOR_ROUNDS && pending.length > 0; round += 1) {
    const rows = await odooSearchRead<TaskRow>('project.task', {
      domain: [['id', 'in', pending]],
      fields: ['id', 'name', 'parent_id', 'project_id', 'partner_id', TRAMITES_SHOW_IN_SYNTIA_FIELD],
      limit: pending.length,
    })

    for (const row of rows) tasks.set(row.id, mapTask(row))
    pending = [
      ...new Set(
        rows
          .map((row) => mapOdooMany2OneId(row.parent_id))
          .filter((id): id is number => id !== undefined && !tasks.has(id))
      ),
    ]
  }

  return tasks
}

export async function fetchSweepTickets(ids: number[]): Promise<Map<number, SweepTicket>> {
  const rows = await odooSearchRead<TaskRow>(getOdooTicketsModel(), {
    domain: [['id', 'in', [...new Set(ids)]]],
    fields: ['id', 'name', 'partner_id'],
    limit: ids.length,
  })

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: typeof row.name === 'string' ? row.name : '',
        partnerId: mapOdooMany2OneId(row.partner_id) ?? null,
      },
    ])
  )
}

export async function fetchSweepProjectPartners(
  projectIds: number[]
): Promise<Map<number, number | null>> {
  const rows = await odooSearchRead<{ id: number; partner_id?: Many2One }>('project.project', {
    domain: [['id', 'in', [...new Set(projectIds)]]],
    fields: ['id', 'partner_id'],
    limit: projectIds.length,
  })

  return new Map(rows.map((row) => [row.id, mapOdooMany2OneId(row.partner_id) ?? null]))
}
