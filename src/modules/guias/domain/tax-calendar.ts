import { taxCalendar, type TaxCalendarWindow } from '@/content/tax-calendar'

export type TaxWindowStatus = 'active' | 'upcoming'

export type RelevantTaxWindow = {
  window: TaxCalendarWindow
  status: TaxWindowStatus
  /** 0 cuando la ventana está abierta */
  daysUntilStart: number
  daysUntilEnd: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toDayDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

/**
 * Ventanas del calendario fiscal abiertas ahora o que abren dentro del
 * horizonte indicado. Comparación por día natural, fin inclusive.
 */
export function getRelevantTaxWindows(
  now: Date,
  horizonDays = 30
): RelevantTaxWindow[] {
  const today = toDayDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const relevant: RelevantTaxWindow[] = []

  for (const window of taxCalendar.windows) {
    // Primera ocurrencia (este año o el siguiente) que aún no ha terminado
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      const start = toDayDate(year, window.start.month, window.start.day)
      const end = toDayDate(year, window.end.month, window.end.day)
      if (end < today) continue

      const daysUntilStart = Math.max(0, diffInDays(today, start))
      const daysUntilEnd = diffInDays(today, end)

      if (start <= today) {
        relevant.push({ window, status: 'active', daysUntilStart: 0, daysUntilEnd })
      } else if (daysUntilStart <= horizonDays) {
        relevant.push({ window, status: 'upcoming', daysUntilStart, daysUntilEnd })
      }
      break
    }
  }

  return relevant.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    if (a.status === 'active') return a.daysUntilEnd - b.daysUntilEnd
    return a.daysUntilStart - b.daysUntilStart
  })
}

export function getWindowById(id: string): TaxCalendarWindow | undefined {
  return taxCalendar.windows.find((window) => window.id === id)
}
