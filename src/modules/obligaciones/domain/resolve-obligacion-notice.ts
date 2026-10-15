import { isTaskCanceled, isTaskDone } from '@/src/modules/tramites/domain/map-task-state'

/** Hora local en la que se decide qué toca avisar: Canarias y Londres comparten huso y cambio de hora. */
export const OBLIGACION_NOTICE_TIME_ZONE = 'Atlantic/Canary'

/** Franja de la mañana: avisos de los días previos al plazo. */
export const OBLIGACION_MORNING_HOUR = 8

/**
 * Franja del día de presentación. Se programa a las 14 y no a las 15 porque
 * en Hobby el cron llega en algún momento de la hora (14:00–14:59): así
 * siempre queda margen antes de acabar la jornada.
 */
export const OBLIGACION_PRESENTATION_HOUR = 14

export type ObligacionNoticeKind = 'domiciliar' | 'normal' | 'presentacion'
export type ObligacionNoticeSlot = 'morning' | 'presentation'

/** Día de hoy y hora en `OBLIGACION_NOTICE_TIME_ZONE`. */
export type ObligacionNoticeClock = {
  year: number
  month: number
  day: number
  hour: number
}

export function getObligacionNoticeClock(now: Date): ObligacionNoticeClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: OBLIGACION_NOTICE_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? Number.NaN)

  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') }
}

export function formatObligacionNoticeDate(clock: ObligacionNoticeClock): string {
  const month = String(clock.month).padStart(2, '0')
  const day = String(clock.day).padStart(2, '0')
  return `${clock.year}-${month}-${day}`
}

/** Franja que corresponde a esta hora, o `null` si no toca avisar (las entradas extra del cron por el cambio de hora). */
export function resolveObligacionNoticeSlot(hour: number): ObligacionNoticeSlot | null {
  if (hour === OBLIGACION_MORNING_HOUR) return 'morning'
  if (hour === OBLIGACION_PRESENTATION_HOUR) return 'presentation'
  return null
}

export function getObligacionNoticeSlotForKind(kind: ObligacionNoticeKind): ObligacionNoticeSlot {
  return kind === 'presentacion' ? 'presentation' : 'morning'
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Días naturales entre hoy y el plazo, comparando solo año/mes/día (sin horas ni husos). */
export function getDaysUntilObligacionDeadlineFromClock(
  deadline: Date,
  clock: ObligacionNoticeClock
): number {
  const deadlineDay = Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
  const today = Date.UTC(clock.year, clock.month - 1, clock.day)
  return Math.round((deadlineDay - today) / MS_PER_DAY)
}

/** Plazo del día 20: estos modelos llevan el calendario de domiciliación completo. */
const DAY_20_DEADLINE = 20

/**
 * Qué aviso toca hoy para una obligación, o `null` si hoy no toca ninguno.
 * Días fijos, sin ajustar por fines de semana ni festivos.
 *
 * - Plazo el día 20: días 10 y 14 (a domiciliar, solo si el modelo se
 *   domicilia), 18 (normal) y 20 (presentación).
 * - Resto de plazos (30/31, anuales…): 5 días antes y el día del plazo.
 *   El de 5 días antes es «a domiciliar» si el modelo se domicilia.
 */
export function resolveObligacionNoticeKind(input: {
  deadline: Date
  clock: ObligacionNoticeClock
  domiciliable: boolean
}): ObligacionNoticeKind | null {
  const daysLeft = getDaysUntilObligacionDeadlineFromClock(input.deadline, input.clock)
  if (daysLeft === 0) return 'presentacion'

  if (input.deadline.getDate() === DAY_20_DEADLINE) {
    if (daysLeft === 10 || daysLeft === 6) return input.domiciliable ? 'domiciliar' : null
    if (daysLeft === 2) return 'normal'
    return null
  }

  if (daysLeft === 5) return input.domiciliable ? 'domiciliar' : 'normal'
  return null
}

export type ObligacionCompletion =
  | { level: 'complete' }
  | { level: 'canceled' }
  | { level: 'missing' }
  | { level: 'partial'; reason: 'done_without_document' | 'document_without_done' }

/** Las que hay que avisar: sin nada hecho (rojo) o con solo una de las dos cosas (ámbar). */
export type ObligacionPendingCompletion = Extract<
  ObligacionCompletion,
  { level: 'missing' | 'partial' }
>

/**
 * Estado real de una obligación para decidir si se avisa. Completa = hecha
 * (presentada) Y con documento: nunca se avisa, sea cual sea la fecha. Una
 * sola de las dos cosas se avisa en ámbar (revisar) y ninguna, en rojo.
 * Cuenta cualquier adjunto: por protocolo solo se sube el justificante.
 */
export function getObligacionCompletion(
  state: string | undefined,
  attachmentCount: number
): ObligacionCompletion {
  if (isTaskCanceled(state)) return { level: 'canceled' }

  const done = isTaskDone(state)
  const hasDocument = attachmentCount > 0

  if (done && hasDocument) return { level: 'complete' }
  if (done) return { level: 'partial', reason: 'done_without_document' }
  if (hasDocument) return { level: 'partial', reason: 'document_without_done' }
  return { level: 'missing' }
}
