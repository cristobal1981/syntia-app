import { extractYearFromRootName } from '@/src/modules/obligaciones/domain/extract-year-from-root-name'
import {
  extractModelCodeFromLabel,
  isFiscalModelDomiciliable,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { resolveObligacionDeadline } from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import {
  getObligacionNoticeSlotForKind,
  resolveObligacionNoticeKind,
  type ObligacionNoticeClock,
  type ObligacionNoticeKind,
  type ObligacionNoticeSlot,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-notice'
import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  isOdooApiConfigured,
  mapOdooMany2OneId,
  mapOdooMany2OneLabel,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { isTaskCanceled } from '@/src/modules/tramites/domain/map-task-state'

/** Tope de filas de adjuntos al comprobar el justificante: de sobra para las tareas de un día. */
const ATTACHMENT_ROWS_LIMIT = 5000

export type ObligacionNoticeCandidate = {
  taskId: number
  partnerId: number
  clientName: string
  modelLabel: string
  deadline: Date
  /** Estado de la tarea en Odoo (`state`), para saber si está hecha. */
  state?: string
  attachmentCount: number
  kind: ObligacionNoticeKind
}

type OdooRootTaskRow = {
  id: number
  name: string
  project_id?: [number, string] | false | null
}

type OdooPeriodTaskRow = {
  id: number
  name: string
  parent_id?: [number, string] | false | null
}

type OdooLeafTaskRow = {
  id: number
  name: string
  parent_id?: [number, string] | false | null
  state?: string | false | null
}

type OdooProjectRow = {
  id: number
  partner_id?: [number, string] | false | null
}

/**
 * Variante "bulk" (todos los clientes de una vez, sin loop por partner) del
 * árbol de obligaciones que ya existe por cliente en
 * `odoo-obligaciones-repository.ts`. Mismo número de llamadas a Odoo (~4)
 * tenga 1 o 500 clientes — pensada para el cron de recordatorios, no para el
 * portal (ese sigue usando la versión por cliente).
 *
 * El plazo se deduce con `resolveObligacionDeadline` (tax-calendar.ts), NO
 * con `date_deadline` de la tarea — ver ese módulo para el porqué.
 *
 * Devuelve solo las tareas a las que HOY (`clock`) toca avisar en esta
 * franja, incluidas las ya hechas: que estén completas (hecha y con
 * justificante) lo decide quien llama, con `getObligacionCompletion`.
 */
export async function listObligacionNoticeCandidates(input: {
  clock: ObligacionNoticeClock
  slot: ObligacionNoticeSlot
}): Promise<ObligacionNoticeCandidate[]> {
  if (!isOdooApiConfigured()) return []

  const { clock, slot } = input
  const parentPrefix = getObligacionesParentPrefix()
  const currentYear = clock.year

  const rootRows = await odooSearchRead<OdooRootTaskRow>('project.task', {
    domain: [
      ['name', '=like', `${parentPrefix}%`],
      ['parent_id', '=', false],
    ],
    fields: ['name', 'project_id'],
    order: 'id asc',
    limit: 2000,
  })

  // Solo el año fiscal en curso y el anterior: cubre el T4, que se declara
  // en enero del año siguiente al año fiscal (ver resolve-obligacion-deadline).
  const relevantRoots = rootRows.filter((row) => {
    const year = extractYearFromRootName(row.name)
    return year !== null && (year === currentYear || year === currentYear - 1)
  })
  if (!relevantRoots.length) return []

  const rootById = new Map(relevantRoots.map((row) => [row.id, row]))
  const rootIds = relevantRoots.map((row) => row.id)

  const periodRows = await odooSearchRead<OdooPeriodTaskRow>('project.task', {
    domain: [['parent_id', 'in', rootIds]],
    fields: ['name', 'parent_id'],
    order: 'id asc',
    limit: 2000,
  })
  if (!periodRows.length) return []

  const periodById = new Map(periodRows.map((row) => [row.id, row]))
  const periodIds = periodRows.map((row) => row.id)

  const leafRows = await odooSearchRead<OdooLeafTaskRow>('project.task', {
    domain: [['parent_id', 'in', periodIds]],
    fields: ['name', 'parent_id', 'state'],
    order: 'id asc',
    limit: 5000,
  })
  if (!leafRows.length) return []

  const projectIds = [
    ...new Set(
      relevantRoots
        .map((row) => mapOdooMany2OneId(row.project_id))
        .filter((id): id is number => typeof id === 'number')
    ),
  ]

  const projectRows = projectIds.length
    ? await odooSearchRead<OdooProjectRow>('project.project', {
        domain: [['id', 'in', projectIds]],
        fields: ['partner_id'],
        limit: projectIds.length,
      })
    : []

  const partnerIdByProjectId = new Map(
    projectRows.map((row) => [row.id, mapOdooMany2OneId(row.partner_id)])
  )
  const partnerNameByProjectId = new Map(
    projectRows.map((row) => [row.id, mapOdooMany2OneLabel(row.partner_id)])
  )

  const warnedCombinations = new Set<string>()
  const due: Array<Omit<ObligacionNoticeCandidate, 'attachmentCount'>> = []

  for (const leaf of leafRows) {
    // Las hechas sí cuentan (una presentada sin justificante se avisa);
    // solo las canceladas quedan fuera.
    if (isTaskCanceled(leaf.state || undefined)) continue

    const periodId = mapOdooMany2OneId(leaf.parent_id)
    const period = periodId !== undefined ? periodById.get(periodId) : undefined
    if (!period) continue

    const rootId = mapOdooMany2OneId(period.parent_id)
    const root = rootId !== undefined ? rootById.get(rootId) : undefined
    if (!root) continue

    const fiscalYear = extractYearFromRootName(root.name)
    const modelCode = extractModelCodeFromLabel(leaf.name)
    if (fiscalYear === null || !modelCode) continue

    const deadline = resolveObligacionDeadline(modelCode, period.name, fiscalYear)
    if (!deadline) {
      const warnKey = `${modelCode}:${period.name}`
      if (!warnedCombinations.has(warnKey)) {
        warnedCombinations.add(warnKey)
        console.warn(
          `[obligacion-reminders] sin ventana de plazo para modelo ${modelCode} / periodo "${period.name}"`
        )
      }
      continue
    }

    const kind = resolveObligacionNoticeKind({
      deadline,
      clock,
      domiciliable: isFiscalModelDomiciliable(modelCode),
    })
    if (!kind || getObligacionNoticeSlotForKind(kind) !== slot) continue

    const projectId = mapOdooMany2OneId(root.project_id)
    const partnerId = projectId !== undefined ? partnerIdByProjectId.get(projectId) : undefined
    if (!partnerId) continue
    const clientName = projectId !== undefined ? partnerNameByProjectId.get(projectId) : undefined
    if (!clientName) continue

    due.push({
      taskId: leaf.id,
      partnerId,
      clientName,
      modelLabel: formatObligacionModelLabel(leaf.name),
      deadline,
      state: leaf.state || undefined,
      kind,
    })
  }

  if (!due.length) return []

  // Solo se cuentan adjuntos de las tareas que hoy tocan avisar.
  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    due.map((candidate) => candidate.taskId),
    ATTACHMENT_ROWS_LIMIT
  )

  return due.map((candidate) => ({
    ...candidate,
    attachmentCount: attachmentCounts.get(candidate.taskId) ?? 0,
  }))
}
