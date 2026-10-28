import { describe, expect, it, vi } from 'vitest'

import {
  runPushAfterEvent,
  WEBHOOK_PUSH_DELAY_MS,
  WEBHOOK_PUSH_LOCK_RETRY_MS,
  WEBHOOK_PUSH_MAX_ATTEMPTS,
  WEBHOOK_PUSH_QUIET_MS,
  WEBHOOK_PUSH_TOTAL_BUDGET_MS,
  type PushAfterEventDeps,
} from '@/src/modules/push/application/dispatch-push-after-event'
import type { PushDispatchSummary } from '@/src/modules/push/application/run-push-dispatch'

const summary = (partial: Partial<PushDispatchSummary> = {}): PushDispatchSummary => ({
  users: 1,
  sent: 1,
  removed: 0,
  skipped: 0,
  truncated: false,
  locked: false,
  ...partial,
})

/** Reloj falso: `sleep` lo adelanta, así que el presupuesto se puede probar sin esperar. */
function setup(overrides: Partial<PushAfterEventDeps> = {}) {
  let clock = 1_000_000
  const sleeps: number[] = []
  const deps: PushAfterEventDeps = {
    isConfigured: () => true,
    sleep: vi.fn(async (ms: number) => {
      sleeps.push(ms)
      clock += ms
    }),
    now: () => clock,
    dispatch: vi.fn().mockResolvedValue(summary()),
    record: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  return { deps, sleeps, advance: (ms: number) => (clock += ms) }
}

describe('runPushAfterEvent', () => {
  it('espera, envía con la espera corta y registra la ejecución', async () => {
    const { deps, sleeps } = setup()

    await runPushAfterEvent(deps)

    expect(sleeps[0]).toBe(WEBHOOK_PUSH_DELAY_MS)
    expect(deps.dispatch).toHaveBeenCalledTimes(1)
    expect(deps.dispatch).toHaveBeenCalledWith({
      quietMs: WEBHOOK_PUSH_QUIET_MS,
      budgetMs: WEBHOOK_PUSH_TOTAL_BUDGET_MS - WEBHOOK_PUSH_DELAY_MS,
    })
    expect(deps.record).toHaveBeenCalledWith(expect.objectContaining({ summary: summary() }))
  })

  it('el envío sale después de la espera, no antes', async () => {
    const order: string[] = []
    const { deps } = setup({
      sleep: vi.fn(async () => {
        order.push('sleep')
      }),
      dispatch: vi.fn(async () => {
        order.push('dispatch')
        return summary()
      }),
    })

    await runPushAfterEvent(deps)

    expect(order).toEqual(['sleep', 'dispatch'])
  })

  it('sin web push configurado no espera ni envía', async () => {
    const { deps } = setup({ isConfigured: () => false })

    await runPushAfterEvent(deps)

    expect(deps.sleep).not.toHaveBeenCalled()
    expect(deps.dispatch).not.toHaveBeenCalled()
  })

  it('con el cerrojo ocupado reintenta pasado el tiempo y registra solo el envío que se hizo', async () => {
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce(summary({ locked: true, sent: 0 }))
      .mockResolvedValueOnce(summary({ sent: 2 }))
    const { deps, sleeps } = setup({ dispatch })

    await runPushAfterEvent(deps)

    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(sleeps).toEqual([WEBHOOK_PUSH_DELAY_MS, WEBHOOK_PUSH_LOCK_RETRY_MS])
    expect(deps.record).toHaveBeenCalledTimes(1)
    expect(deps.record).toHaveBeenCalledWith(
      expect.objectContaining({ summary: expect.objectContaining({ sent: 2 }) }),
    )
  })

  it('con el cerrojo siempre ocupado para tras el máximo de intentos y no registra nada', async () => {
    const { deps } = setup({ dispatch: vi.fn().mockResolvedValue(summary({ locked: true })) })

    await runPushAfterEvent(deps)

    expect(deps.dispatch).toHaveBeenCalledTimes(WEBHOOK_PUSH_MAX_ATTEMPTS)
    expect(deps.record).not.toHaveBeenCalled()
  })

  it('un fallo del envío se registra y no se propaga ni se reintenta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps } = setup({ dispatch: vi.fn().mockRejectedValue(new Error('boom')) })

    await expect(runPushAfterEvent(deps)).resolves.toBeUndefined()

    expect(deps.dispatch).toHaveBeenCalledTimes(1)
    expect(deps.record).toHaveBeenCalledWith(expect.objectContaining({ error: 'boom' }))
  })

  it('si ya no queda presupuesto para un envío útil no lo intenta', async () => {
    const dispatch = vi.fn().mockResolvedValue(summary({ locked: true }))
    let clockSkew = 0
    const { deps } = setup({
      dispatch,
      sleep: vi.fn(async () => {
        clockSkew += 20_000
      }),
      now: () => 1_000_000 + clockSkew,
    })

    await runPushAfterEvent(deps)

    // Cada espera adelanta 20 s: tras la inicial quedan 30 s (envía), tras el reintento 10 s
    // (envía por última vez) y tras el siguiente ya no queda nada, aunque se permitan 3 intentos.
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(deps.record).not.toHaveBeenCalled()
  })
})
