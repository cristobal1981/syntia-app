import { describe, expect, it } from 'vitest'

import {
  PRESENCE_REFRESH_MIN_INTERVAL_MS,
  shouldRefreshPresenceOnVisible,
} from '@/src/modules/profile/domain/advisor-presence-refresh'

describe('shouldRefreshPresenceOnVisible', () => {
  it('pide si nunca se ha pedido', () => {
    expect(shouldRefreshPresenceOnVisible(null, 1_000)).toBe(true)
  })

  it('no pide antes del intervalo mínimo', () => {
    expect(shouldRefreshPresenceOnVisible(0, PRESENCE_REFRESH_MIN_INTERVAL_MS - 1)).toBe(false)
  })

  it('pide justo al cumplirse el intervalo y después', () => {
    expect(shouldRefreshPresenceOnVisible(0, PRESENCE_REFRESH_MIN_INTERVAL_MS)).toBe(true)
    expect(shouldRefreshPresenceOnVisible(0, PRESENCE_REFRESH_MIN_INTERVAL_MS * 3)).toBe(true)
  })

  it('el intervalo mínimo es de 30 s', () => {
    expect(PRESENCE_REFRESH_MIN_INTERVAL_MS).toBe(30_000)
  })

  it('admite otro intervalo', () => {
    expect(shouldRefreshPresenceOnVisible(0, 5_000, 10_000)).toBe(false)
    expect(shouldRefreshPresenceOnVisible(0, 10_000, 10_000)).toBe(true)
  })
})
