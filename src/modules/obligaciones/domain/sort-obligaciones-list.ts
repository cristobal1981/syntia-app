import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { formatObligacionPeriodLabel } from '@/src/modules/obligaciones/domain/format-obligacion-period-label'
import { comparePeriodSortKeys } from '@/src/modules/obligaciones/domain/sort-obligacion-periods'
import type {
  ObligacionTask,
  ObligacionYear,
} from '@/src/modules/obligaciones/domain/types'
import { isTaskClosed } from '@/src/modules/tramites/domain/map-task-state'

export type ObligacionListRow = ObligacionTask & {
  year: number
  yearLabel: string
  periodLabel: string
  periodSortKey: readonly [number, number, string]
}

export function flattenObligacionesYear(year: ObligacionYear): ObligacionListRow[] {
  const rows: ObligacionListRow[] = []

  for (const period of year.periods) {
    for (const task of period.tasks) {
      const periodDisplay = formatObligacionPeriodLabel(period.label, task.name)

      rows.push({
        ...task,
        year: year.year,
        yearLabel: year.label,
        periodLabel: periodDisplay.label,
        periodSortKey: periodDisplay.sortKey,
      })
    }
  }

  return rows
}

export type ObligacionListSortColumn = 'period' | 'model' | 'state' | 'documents'

function getStateSortRank(state?: string): number {
  if (isTaskClosed(state)) {
    return state === '1_canceled' || state === 'canceled' || state === 'cancelled'
      ? 2
      : 0
  }

  return 1
}

export function sortObligacionListRows(
  rows: ObligacionListRow[],
  column: ObligacionListSortColumn,
  direction: 'asc' | 'desc'
): ObligacionListRow[] {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    let result = 0

    switch (column) {
      case 'period':
        result = comparePeriodSortKeys(a.periodSortKey, b.periodSortKey)
        break
      case 'model':
        result = formatObligacionModelLabel(a.name).localeCompare(
          formatObligacionModelLabel(b.name),
          'es'
        )
        break
      case 'state':
        result = getStateSortRank(a.state) - getStateSortRank(b.state)
        break
      case 'documents':
        result = a.attachmentCount - b.attachmentCount
        break
    }

    if (result !== 0) {
      return result * multiplier
    }

    return comparePeriodSortKeys(a.periodSortKey, b.periodSortKey)
  })
}
