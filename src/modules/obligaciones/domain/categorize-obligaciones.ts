import { extractModelCodeFromLabel } from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import {
  getObligacionDeadlineStatus,
  resolveObligacionDeadline,
  type ObligacionDeadlineStatus,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import type { ObligacionListRow } from '@/src/modules/obligaciones/domain/sort-obligaciones-list'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'

export type ObligacionListRowWithDeadline = ObligacionListRow & {
  deadline: Date | null
  deadlineStatus: ObligacionDeadlineStatus
}

export function attachObligacionDeadlineInfo(
  rows: ObligacionListRow[]
): ObligacionListRowWithDeadline[] {
  return rows.map((row) => {
    const modelCode = extractModelCodeFromLabel(row.name)
    const deadline = modelCode
      ? resolveObligacionDeadline(modelCode, row.periodLabel, row.year)
      : null

    return {
      ...row,
      deadline,
      deadlineStatus: getObligacionDeadlineStatus(deadline, isTaskClosed(row.state)),
    }
  })
}

export type ObligacionClosedYearGroup = {
  year: number
  yearLabel: string
  rows: ObligacionListRowWithDeadline[]
}

export type CategorizedObligaciones = {
  /** Atrasadas o próximas a vencer (dentro de OBLIGACION_REMINDER_DAYS_AHEAD), de cualquier año. */
  urgent: ObligacionListRowWithDeadline[]
  /** Abiertas sin urgencia inminente (vencimiento lejano o sin ventana calculable). */
  pending: ObligacionListRowWithDeadline[]
  /** Presentadas/canceladas, agrupadas por año fiscal (más reciente primero). */
  closedByYear: ObligacionClosedYearGroup[]
}

export function categorizeObligaciones(
  rows: ObligacionListRowWithDeadline[]
): CategorizedObligaciones {
  const urgent: ObligacionListRowWithDeadline[] = []
  const pending: ObligacionListRowWithDeadline[] = []
  const closedByYear = new Map<number, ObligacionClosedYearGroup>()

  for (const row of rows) {
    if (isTaskClosed(row.state)) {
      const group = closedByYear.get(row.year) ?? {
        year: row.year,
        yearLabel: row.yearLabel,
        rows: [],
      }
      group.rows.push(row)
      closedByYear.set(row.year, group)
      continue
    }

    if (row.deadlineStatus === 'overdue' || row.deadlineStatus === 'dueSoon') {
      urgent.push(row)
    } else {
      pending.push(row)
    }
  }

  // Atrasadas primero, de forma implícita: su `deadline` siempre es anterior a
  // hoy, y el de las "próximas a vencer" siempre es posterior o igual a hoy.
  urgent.sort((a, b) => (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0))

  return {
    urgent,
    pending,
    closedByYear: [...closedByYear.values()].sort((a, b) => b.year - a.year),
  }
}
