import { describe, expect, it } from 'vitest'

import {
  getInitialPollIntervalMs,
  SIGNAL_POLL_INTERVAL_MS,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-scheduler'

describe('intervalo de la señal de eventos', () => {
  it('es de 10 s: el aviso llega al portal en segundos, no en el sondeo completo', () => {
    expect(SIGNAL_POLL_INTERVAL_MS).toBe(10_000)
  })

  it('es bastante más corto que el sondeo completo (que va contra Odoo)', () => {
    expect(SIGNAL_POLL_INTERVAL_MS).toBeLessThan(getInitialPollIntervalMs())
  })
})
