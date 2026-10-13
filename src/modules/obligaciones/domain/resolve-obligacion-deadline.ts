import { taxCalendar, type TaxCalendarWindow } from '@/content/tax-calendar'
import { getPeriodSortKey } from '@/src/modules/obligaciones/domain/sort-obligacion-periods'

/**
 * Ventanas trimestrales declaradas dentro del mismo año fiscal. El resto de
 * ventanas (anuales, 347, renta, sociedades, y T4) se declaran en el año
 * fiscal siguiente — ver `content/tax-calendar.ts` para las fechas reales.
 */
const SAME_FISCAL_YEAR_WINDOW_IDS = new Set(['t1', 't2', 't3'])

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

function findAnnualWindow(modelCode: string): TaxCalendarWindow | null {
  return (
    taxCalendarWindows.find(
      (window) => window.quarter === undefined && windowCoversModel(window, modelCode)
    ) ?? null
  )
}

/**
 * Deduce el plazo legal real (AEAT) de una obligación a partir de su modelo,
 * periodo y año fiscal, usando las ventanas de `content/tax-calendar.ts` —
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
  } else if (periodKind === 0) {
    window = findAnnualWindow(modelCode)
  }

  if (!window) return null

  const deadlineYear = SAME_FISCAL_YEAR_WINDOW_IDS.has(window.id)
    ? fiscalYear
    : fiscalYear + 1

  return new Date(deadlineYear, window.end.month - 1, window.end.day, 23, 59, 59)
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

/**
 * Ventana de aviso compartida con los emails de recordatorio
 * (`run-obligacion-reminders.ts`): una obligación "próxima a vencer" en la
 * lista del portal es, a propósito, la misma que dispara el email.
 */
export const OBLIGACION_REMINDER_DAYS_AHEAD = 5

/**
 * Segundo aviso (escalado) del cron de recordatorios: si una obligación
 * sigue sin presentar cerca del plazo, se manda un aviso adicional de tipo
 * `urgent`, independiente del `early` ya enviado al entrar en la ventana de
 * `OBLIGACION_REMINDER_DAYS_AHEAD` — ver `resolveObligacionReminderStage` y
 * `run-obligacion-reminders.ts`.
 */
export const OBLIGACION_URGENT_REMINDER_DAYS_AHEAD = 2

export type ObligacionReminderStage = 'early' | 'urgent'

/**
 * Qué aviso corresponde a una obligación según cuánto falta: por debajo del
 * umbral urgente, `urgent`; si no, `early`. El cron solo manda el email si
 * ESE aviso concreto (tarea + stage) no se había mandado antes — así una
 * tarea nunca recibe dos emails el mismo día aunque entrase directamente
 * dentro de la ventana urgente (sin pasar antes por `early`).
 */
export function resolveObligacionReminderStage(daysLeft: number): ObligacionReminderStage {
  return daysLeft <= OBLIGACION_URGENT_REMINDER_DAYS_AHEAD ? 'urgent' : 'early'
}

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
