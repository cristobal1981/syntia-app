import { taxCalendar, type TaxCalendarWindow } from '@/content/tax-calendar'
import { getPeriodSortKey } from '@/src/modules/obligaciones/domain/sort-obligacion-periods'

const taxCalendarWindows: readonly TaxCalendarWindow[] = taxCalendar.windows

function windowCoversModel(window: TaxCalendarWindow, modelCode: string): boolean {
  return (window.modelCodes as readonly string[]).includes(modelCode)
}

/**
 * Puede haber más de una ventana para el mismo trimestre (p. ej. el 4T: IVA
 * hasta el 30, retenciones hasta el 20) — se distinguen por `modelCodes`, no
 * por `id`.
 */
function findQuarterWindow(quarter: number, modelCode: string): TaxCalendarWindow | null {
  return (
    taxCalendarWindows.find(
      (window) => window.quarter === quarter && windowCoversModel(window, modelCode)
    ) ?? null
  )
}

/** Modelos por «Periodo N» (hoy el 202): la ventana que declara ese periodo. */
function findPeriodWindow(period: number, modelCode: string): TaxCalendarWindow | null {
  return (
    taxCalendarWindows.find(
      (window) => window.period === period && windowCoversModel(window, modelCode)
    ) ?? null
  )
}

function findAnnualWindow(modelCode: string): TaxCalendarWindow | null {
  return (
    taxCalendarWindows.find(
      (window) =>
        window.quarter === undefined &&
        window.period === undefined &&
        windowCoversModel(window, modelCode)
    ) ?? null
  )
}

/**
 * La ventana se declara en el mismo año fiscal cuando es de los trimestres
 * 1–3 o de un periodo del 202 (abril, octubre y diciembre del propio año). El
 * resto (4T, anuales, 347, renta, sociedades) cae en el año fiscal siguiente.
 */
function isSameFiscalYearWindow(window: TaxCalendarWindow): boolean {
  if (window.period !== undefined) return true
  return window.quarter !== undefined && window.quarter <= 3
}

/**
 * Deduce el plazo legal real (AEAT o ATC) de una obligación a partir de su
 * modelo, periodo y año fiscal, usando las ventanas de `content/tax-calendar.ts` —
 * NUNCA el `date_deadline` de la tarea en Odoo, que es una fecha interna que
 * pone el gestor a mano y no representa el plazo legal.
 *
 * Devuelve `null` cuando la combinación modelo+periodo no está cubierta por
 * ninguna ventana (p. ej. periodos "Mensuales": hoy no hay ventana para
 * ellos en `tax-calendar.ts`) — en ese caso no se inventa una fecha.
 */
export function resolveObligacionDeadline(
  modelCode: string,
  periodLabel: string,
  fiscalYear: number
): Date | null {
  const [periodKind, periodNumber] = getPeriodSortKey(periodLabel)

  let window: TaxCalendarWindow | null = null
  if (periodKind === 1 && periodNumber >= 1 && periodNumber <= 4) {
    window = findQuarterWindow(periodNumber, modelCode)
  } else if (periodKind === 3 && periodNumber >= 1 && periodNumber <= 3) {
    window = findPeriodWindow(periodNumber, modelCode)
  } else if (periodKind === 0) {
    window = findAnnualWindow(modelCode)
  }

  if (!window) return null

  const deadlineYear = isSameFiscalYearWindow(window) ? fiscalYear : fiscalYear + 1
  const end = window.endByModel?.[modelCode] ?? window.end

  return new Date(deadlineYear, end.month - 1, end.day, 23, 59, 59)
}

export function getDaysUntilObligacionDeadline(deadline: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDateOnly = new Date(deadline)
  dueDateOnly.setHours(0, 0, 0, 0)

  return Math.round((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function isObligacionDueWithin(deadline: Date, maxDays: number): boolean {
  const days = getDaysUntilObligacionDeadline(deadline)
  return days >= 0 && days <= maxDays
}

/** Ventana de "vence pronto" de la lista del portal. */
export const OBLIGACION_REMINDER_DAYS_AHEAD = 5

export type ObligacionDeadlineStatus = 'overdue' | 'dueSoon' | 'onTrack' | 'none'

export function getObligacionDeadlineStatus(
  deadline: Date | null,
  isClosed: boolean
): ObligacionDeadlineStatus {
  if (!deadline || isClosed) return 'none'

  const days = getDaysUntilObligacionDeadline(deadline)
  if (days < 0) return 'overdue'
  if (days <= OBLIGACION_REMINDER_DAYS_AHEAD) return 'dueSoon'
  return 'onTrack'
}
