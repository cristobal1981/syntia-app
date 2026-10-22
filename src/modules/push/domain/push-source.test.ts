import { describe, expect, it } from 'vitest'

import { resolvePushSource } from '@/src/modules/push/domain/push-source'

describe('resolvePushSource', () => {
  it.each(['events', 'EVENTS', ' events '])('«%s» activa los eventos', (value) => {
    expect(resolvePushSource(value)).toBe('events')
  })

  it.each([undefined, '', 'snapshots', 'event', 'true', '1'])(
    '«%s» deja el cálculo anterior',
    (value) => {
      expect(resolvePushSource(value)).toBe('snapshots')
    }
  )
})
