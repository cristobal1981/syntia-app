import { dispatchPushEvents } from '@/src/modules/push/application/dispatch-push-notifications'
import type { PushDispatchSummary } from '@/src/modules/push/application/run-push-dispatch'
import { recordPushRun } from '@/src/modules/push/infrastructure/push-runs.supabase'
import { isWebPushConfigured } from '@/src/modules/push/infrastructure/web-push-sender'

/** Espera tras guardar el evento antes de enviar, para que los que llegan seguidos salgan juntos. */
export const WEBHOOK_PUSH_DELAY_MS = 8_000

/** Un evento solo se envía si lleva al menos esto guardado (los más nuevos esperan a su propio envío). */
export const WEBHOOK_PUSH_QUIET_MS = 5_000

/** Si otro envío tiene el cerrojo, se reintenta pasado este tiempo. */
export const WEBHOOK_PUSH_LOCK_RETRY_MS = 5_000
export const WEBHOOK_PUSH_MAX_ATTEMPTS = 3

/** Tiempo total del envío disparado desde el webhook (la ruta tiene `maxDuration` de 60 s). */
export const WEBHOOK_PUSH_TOTAL_BUDGET_MS = 50_000

/** Margen que debe quedar para empezar un envío (más corto no daría tiempo a nada útil). */
const MIN_DISPATCH_BUDGET_MS = 10_000

export type PushAfterEventDeps = {
  isConfigured: () => boolean
  sleep: (ms: number) => Promise<void>
  now: () => number
  dispatch: (options: { quietMs: number; budgetMs: number }) => Promise<PushDispatchSummary>
  record: (input: {
    startedAt: Date
    summary?: PushDispatchSummary
    error?: string
  }) => Promise<void>
}

/**
 * Envía el push de un evento recién guardado sin esperar al pulso de pg_cron: espera unos
 * segundos (agrupa ráfagas), envía lo pendiente y, si otro envío tiene el cerrojo, reintenta.
 * El pulso sigue como red de seguridad. Nunca lanza: corre dentro de `after()`.
 */
export async function runPushAfterEvent(deps: PushAfterEventDeps): Promise<void> {
  if (!deps.isConfigured()) return

  const taskStartedAt = deps.now()
  await deps.sleep(WEBHOOK_PUSH_DELAY_MS)

  for (let attempt = 1; attempt <= WEBHOOK_PUSH_MAX_ATTEMPTS; attempt += 1) {
    const remaining = WEBHOOK_PUSH_TOTAL_BUDGET_MS - (deps.now() - taskStartedAt)
    if (remaining < MIN_DISPATCH_BUDGET_MS) return

    const startedAt = new Date(deps.now())
    try {
      const summary = await deps.dispatch({ quietMs: WEBHOOK_PUSH_QUIET_MS, budgetMs: remaining })
      // Un envío saltado por el cerrojo no es una ejecución: el otro lo registra.
      if (!summary.locked) {
        await deps.record({ startedAt, summary })
        return
      }
    } catch (error) {
      console.error('[push webhook] envío falló', error)
      await deps.record({
        startedAt,
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }
    await deps.sleep(WEBHOOK_PUSH_LOCK_RETRY_MS)
  }
}

/** Lo que programa el webhook con `after()`. */
export function runPushAfterEventInProduction(): Promise<void> {
  return runPushAfterEvent({
    isConfigured: isWebPushConfigured,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    dispatch: (options) => dispatchPushEvents(options),
    record: (input) => recordPushRun({ source: 'events', ...input }),
  })
}
