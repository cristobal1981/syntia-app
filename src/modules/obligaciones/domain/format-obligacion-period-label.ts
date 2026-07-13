import {
  getMonthFromTaskName,
  getPeriodSortKey,
  normalizePeriodName,
  type PeriodSortKey,
} from '@/src/modules/obligaciones/domain/sort-obligacion-periods'

export function formatObligacionPeriodLabel(
  periodContainer: string,
  taskName: string
): { label: string; sortKey: PeriodSortKey } {
  const containerNormalized = normalizePeriodName(periodContainer.trim())

  if (containerNormalized === 'mensuales' || containerNormalized === 'mensual') {
    const month = getMonthFromTaskName(taskName)
    if (month) {
      return {
        label: month.label,
        sortKey: [2, month.monthIndex, normalizePeriodName(month.label)],
      }
    }
  }

  const label = periodContainer.trim()
  return {
    label,
    sortKey: getPeriodSortKey(label),
  }
}
