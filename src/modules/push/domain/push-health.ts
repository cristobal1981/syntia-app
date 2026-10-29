export type PushHealthRun = {
  source: 'events' | 'snapshots' | 'sweep'
  startedAt: number
  hadError: boolean
  locked: boolean
  truncated: boolean
  /** En un barrido, eventos que faltaban y se han recuperado. */
  created: number
  /** Envíos que el servicio de push rechazó en esta ejecución (400, 401, 403, 413). */
  rejected: number
  /** Envíos que fallaron por algo transitorio en esta ejecución (red, 429, 5xx). */
  failed: number
}

export type PushHealthInput = {
  now: number
  /** De dónde salen los avisos ahora (`PUSH_SOURCE`). */
  source: 'events' | 'snapshots'
  /** Ejecuciones recientes de `push_runs`, de más nueva a más antigua. */
  runs: PushHealthRun[]
  /** Último evento recibido de Odoo, o `null` si no hay. */
  lastEventAt: number | null
  /** Recepción del evento más antiguo aún sin procesar por algún dispositivo (dentro de su plazo), o `null`. */
  oldestPendingEventAt: number | null
  /** Desde cuándo hay un dispositivo sin foto inicial (`last_event_seq` nulo), o `null` si no hay ninguno. */
  unsetCursorSince: number | null
}

export type PushHealthProblem = {
  code:
    | 'pulse_stalled'
    | 'run_errors'
    | 'stuck_lock'
    | 'backlog'
    | 'events_silent'
    | 'sweep_stalled'
    | 'events_lost'
    | 'event_pending'
    | 'cursor_unset'
    | 'push_rejected'
    | 'push_failing'
  severity: 'error' | 'warning'
  message: string
}

export type PushHealth = { ok: boolean; problems: PushHealthProblem[] }

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Sin ninguna ejecución del dispatcher en este tiempo, el pulso se ha parado. */
export const PULSE_STALLED_MS = 15 * MINUTE
/** Sin ningún barrido en este tiempo, el barrido se ha parado (pasa cada 30 min). */
export const SWEEP_STALLED_MS = 2 * HOUR
/** En horario laboral, sin eventos en este tiempo se avisa de silencio. */
export const EVENTS_SILENT_MS = 4 * HOUR
/** Con el pulso cada minuto, un evento sin procesar más tiempo que este indica que no se está entregando. */
export const EVENT_PENDING_MS = 10 * MINUTE
/** La primera ejecución con eventos coloca el cursor: un dispositivo sin él tanto tiempo no se está atendiendo. */
export const CURSOR_UNSET_MS = 10 * MINUTE
export const RECENT_RUNS_WINDOW = 10
/** Ejecuciones recién hechas que se miran para los rechazos y los fallos de envío. */
export const SEND_PROBLEM_WINDOW = 5
/** Con tantas ejecuciones de esa ventana con rechazos (o fallos), se avisa. */
export const SEND_PROBLEM_RUNS = 3

const BUSINESS_DAYS = new Set(['lun', 'mar', 'mié', 'jue', 'vie'])
const BUSINESS_START_HOUR = 8
const BUSINESS_END_HOUR = 20

/** Lunes a viernes, de 8:00 a 20:00 en Madrid. */
export function isBusinessHours(now: number): boolean {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(now))
  const weekday = parts.find((part) => part.type === 'weekday')?.value.replace('.', '')
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  return (
    weekday !== undefined &&
    BUSINESS_DAYS.has(weekday) &&
    hour >= BUSINESS_START_HOUR &&
    hour < BUSINESS_END_HOUR
  )
}

/**
 * Estado de salud del envío de push a partir de lo que dejan las ejecuciones:
 * pulso parado, errores repetidos, cerrojo atascado, atasco de eventos, silencio
 * de Odoo en horario laboral, barrido parado o eventos que tuvo que recuperar
 * el barrido (señal de que algún evento se perdió).
 */
export function evaluatePushHealth(input: PushHealthInput): PushHealth {
  const problems: PushHealthProblem[] = []
  const dispatches = input.runs.filter((run) => run.source !== 'sweep')
  const sweeps = input.runs.filter((run) => run.source === 'sweep')
  const recent = dispatches.slice(0, RECENT_RUNS_WINDOW)

  const lastDispatch = dispatches[0]
  if (!lastDispatch || input.now - lastDispatch.startedAt > PULSE_STALLED_MS) {
    problems.push({
      code: 'pulse_stalled',
      severity: 'error',
      message: lastDispatch
        ? 'El dispatcher de push no se ejecuta desde hace más de 15 minutos.'
        : 'El dispatcher de push no ha registrado ninguna ejecución.',
    })
  }

  const errors = recent.filter((run) => run.hadError).length
  if (recent[0]?.hadError || errors >= 3) {
    problems.push({
      code: 'run_errors',
      severity: 'error',
      message: `El dispatcher falla (${errors} de las últimas ${recent.length} ejecuciones con error).`,
    })
  }

  if (recent.length >= 5 && recent.slice(0, 5).every((run) => run.locked)) {
    problems.push({
      code: 'stuck_lock',
      severity: 'error',
      message: 'Las últimas 5 ejecuciones se han saltado por el cerrojo: puede estar atascado.',
    })
  }

  if (recent.length >= 5 && recent.slice(0, 5).filter((run) => run.truncated).length >= 3) {
    problems.push({
      code: 'backlog',
      severity: 'warning',
      message: 'El dispatcher llega al límite de tiempo o de eventos de forma repetida.',
    })
  }

  if (
    input.source === 'events' &&
    isBusinessHours(input.now) &&
    (input.lastEventAt === null || input.now - input.lastEventAt > EVENTS_SILENT_MS)
  ) {
    problems.push({
      code: 'events_silent',
      severity: 'warning',
      message:
        'Odoo no envía eventos desde hace más de 4 horas en horario laboral: puede haber dejado de enviar.',
    })
  }

  // Un rechazo suelto es un dispositivo; repetido en ejecuciones seguidas suele ser configuración
  // (claves VAPID) o el servicio de push caído. Las ejecuciones saltadas por el cerrojo no cuentan.
  const sendRuns = recent.filter((run) => !run.locked).slice(0, SEND_PROBLEM_WINDOW)
  if (sendRuns.filter((run) => run.rejected > 0).length >= SEND_PROBLEM_RUNS) {
    problems.push({
      code: 'push_rejected',
      severity: 'warning',
      message: `El servicio de push rechaza envíos en ${SEND_PROBLEM_RUNS} o más de las últimas ${sendRuns.length} ejecuciones: revisar las claves VAPID.`,
    })
  }
  if (sendRuns.filter((run) => run.failed > 0).length >= SEND_PROBLEM_RUNS) {
    problems.push({
      code: 'push_failing',
      severity: 'warning',
      message: `Fallan envíos (red, límite o error del servicio) en ${SEND_PROBLEM_RUNS} o más de las últimas ${sendRuns.length} ejecuciones.`,
    })
  }

  const lastSweep = sweeps[0]
  if (lastSweep && input.now - lastSweep.startedAt > SWEEP_STALLED_MS) {
    problems.push({
      code: 'sweep_stalled',
      severity: 'warning',
      message: 'El barrido de reconciliación no se ejecuta desde hace más de 2 horas.',
    })
  }

  const recovered = sweeps.reduce((total, run) => total + run.created, 0)
  if (recovered > 0) {
    problems.push({
      code: 'events_lost',
      severity: 'warning',
      message: `El barrido ha tenido que recuperar ${recovered} mensajes cuyo evento no llegó.`,
    })
  }

  if (input.source === 'events') {
    if (input.oldestPendingEventAt !== null && input.now - input.oldestPendingEventAt > EVENT_PENDING_MS) {
      problems.push({
        code: 'event_pending',
        severity: 'warning',
        message: 'Hay un evento sin entregar desde hace más de 10 minutos.',
      })
    }
    if (input.unsetCursorSince !== null && input.now - input.unsetCursorSince > CURSOR_UNSET_MS) {
      problems.push({
        code: 'cursor_unset',
        severity: 'warning',
        message: 'Hay un dispositivo sin cursor de eventos desde hace más de 10 minutos.',
      })
    }
  }

  return { ok: problems.every((problem) => problem.severity !== 'error'), problems }
}
