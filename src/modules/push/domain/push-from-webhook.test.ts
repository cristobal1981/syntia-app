import { describe, expect, it } from 'vitest'

import { isPushFromWebhookEnabled } from '@/src/modules/push/domain/push-from-webhook'

describe('isPushFromWebhookEnabled', () => {
  it.each([
    [{ PUSH_FROM_WEBHOOK: '1', PUSH_SOURCE: 'events' }, true],
    [{ PUSH_FROM_WEBHOOK: ' 1 ', PUSH_SOURCE: 'EVENTS' }, true],
    [{ PUSH_FROM_WEBHOOK: '1', PUSH_SOURCE: 'snapshots' }, false],
    [{ PUSH_FROM_WEBHOOK: '1' }, false],
    [{ PUSH_FROM_WEBHOOK: '0', PUSH_SOURCE: 'events' }, false],
    [{ PUSH_FROM_WEBHOOK: 'true', PUSH_SOURCE: 'events' }, false],
    [{ PUSH_SOURCE: 'events' }, false],
    [{}, false],
  ])('%j → %s', (env, expected) => {
    expect(isPushFromWebhookEnabled(env)).toBe(expected)
  })
})
