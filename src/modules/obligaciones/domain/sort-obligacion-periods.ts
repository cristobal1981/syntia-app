export type PeriodSortKey = readonly [number, number, string]

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export function normalizePeriodName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function getPeriodSortKey(name: string): PeriodSortKey {
  const normalized = normalizePeriodName(name.trim())

  if (normalized === 'anuales' || normalized === 'anual') {
    return [0, 0, normalized]
  }

  const trimestreMatch = normalized.match(/^trimestre\s*(\d+)/)
  if (trimestreMatch) {
    return [1, Number.parseInt(trimestreMatch[1], 10), normalized]
  }

  if (normalized === 'mensuales' || normalized === 'mensual') {
    return [2, 0, normalized]
  }

  const periodoMatch = normalized.match(/^periodo\s*(\d+)/)
  if (periodoMatch) {
    return [3, Number.parseInt(periodoMatch[1], 10), normalized]
  }

  for (let index = 0; index < MONTH_LABELS.length; index += 1) {
    const monthLabel = MONTH_LABELS[index]
    if (normalized === normalizePeriodName(monthLabel)) {
      return [2, index + 1, normalized]
    }
  }

  return [4, 0, normalized]
}

export function comparePeriodSortKeys(a: PeriodSortKey, b: PeriodSortKey): number {
  for (let index = 0; index < 3; index += 1) {
    if (typeof a[index] === 'number' && typeof b[index] === 'number') {
      if (a[index] !== b[index]) {
        return (a[index] as number) - (b[index] as number)
      }
      continue
    }

    const result = String(a[index]).localeCompare(String(b[index]), 'es')
    if (result !== 0) return result
  }

  return 0
}

type PeriodRow = {
  id: number
  name: string
}

export function sortObligacionPeriodRows<T extends PeriodRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    comparePeriodSortKeys(getPeriodSortKey(a.name), getPeriodSortKey(b.name))
  )
}

export function getMonthFromTaskName(
  taskName: string
): { label: (typeof MONTH_LABELS)[number]; monthIndex: number } | null {
  const withoutClient = taskName.replace(/\s+-\s+[^-]+$/, '').trim()
  const normalized = normalizePeriodName(withoutClient)

  for (let index = 0; index < MONTH_LABELS.length; index += 1) {
    const monthLabel = MONTH_LABELS[index]
    if (normalized.includes(normalizePeriodName(monthLabel))) {
      return { label: monthLabel, monthIndex: index + 1 }
    }
  }

  return null
}
