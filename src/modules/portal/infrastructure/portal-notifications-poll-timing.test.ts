import { describe, expect, it } from 'vitest'

import { shouldRunFullNotificationsCheck } from '@/src/modules/portal/infrastructure/portal-notifications-poll-timing'

const base = { signalSeq: 10, lastSignalSeq: 10, lastFullCheckAt: 1_000_000, now: 1_030_000, maxAgeMs: 300_000 }

describe('shouldRunFullNotificationsCheck', () => {
  it('sin eventos nuevos y con la última comprobación reciente, se la salta', () => {
    expect(shouldRunFullNotificationsCheck(base)).toBe(false)
  })

  it('con un evento nuevo la hace, suba el seq lo que suba', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, signalSeq: 11 })).toBe(true)
  })

  it('la primera vez la hace siempre (sin seq o sin comprobación previa)', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, lastSignalSeq: null })).toBe(true)
    expect(shouldRunFullNotificationsCheck({ ...base, lastFullCheckAt: null })).toBe(true)
  })

  it('al cumplirse el máximo la hace aunque no haya eventos (cubre lo que no llega por eventos)', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, now: 1_299_999 })).toBe(false)
    expect(shouldRunFullNotificationsCheck({ ...base, now: 1_300_000 })).toBe(true)
  })

  it('un seq que baja (se purgaron eventos) también cuenta como cambio', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, signalSeq: 0 })).toBe(true)
  })
})
