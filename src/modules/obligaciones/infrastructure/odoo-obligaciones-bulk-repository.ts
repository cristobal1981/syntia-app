import { extractYearFromRootName } from '@/src/modules/obligaciones/domain/extract-year-from-root-name'
import { extractModelCodeFromLabel } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import {
  isObligacionDueWithin,
  resolveObligacionDeadline,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import {
  isOdooApiConfigured,
  mapOdooMany2OneId,
  mapOdooMany2OneLabel,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'

export type UpcomingObligacionReminder = {
  taskId: number
  partnerId: number
  clientName: string
  modelLabel: string
  deadline: Date
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
 */
export async function listUpcomingObligacionReminders(
  maxDaysAhead: number
): Promise<UpcomingObligacionReminder[]> {
  if (!isOdooApiConfigured()) return []

  const parentPrefix = getObligacionesParentPrefix()
  const currentYear = new Date().getFullYear()

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
  const reminders: UpcomingObligacionReminder[] = []

  for (const leaf of leafRows) {
    if (isTaskClosed(leaf.state || undefined)) continue

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

    if (!isObligacionDueWithin(deadline, maxDaysAhead)) continue

    const projectId = mapOdooMany2OneId(root.project_id)
    const partnerId = projectId !== undefined ? partnerIdByProjectId.get(projectId) : undefined
    if (!partnerId) continue
    const clientName = projectId !== undefined ? partnerNameByProjectId.get(projectId) : undefined
    if (!clientName) continue

    reminders.push({
      taskId: leaf.id,
      partnerId,
      clientName,
      modelLabel: formatObligacionModelLabel(leaf.name),
      deadline,
    })
  }

  return reminders
}
