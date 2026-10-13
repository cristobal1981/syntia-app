import { describe, expect, it } from 'vitest'

import {
  deriveEmailFailure,
  deriveEmailProgressStep,
} from '@/src/modules/onboarding/domain/onboarding-email-progress'

function timestamps(
  overrides: Partial<{
    emailSentAt: string | null
    emailDeliveredAt: string | null
    emailOpenedAt: string | null
    emailClickedAt: string | null
    emailBouncedAt: string | null
    emailComplainedAt: string | null
  }> = {}
) {
  return {
    emailSentAt: null,
    emailDeliveredAt: null,
    emailOpenedAt: null,
    emailClickedAt: null,
    emailBouncedAt: null,
    emailComplainedAt: null,
    ...overrides,
  }
}

describe('deriveEmailProgressStep (returns the FURTHEST reached step, clicked > opened > delivered > sent)', () => {
  it('returns null when nothing has happened yet', () => {
    expect(deriveEmailProgressStep(timestamps())).toBeNull()
  })

  it('returns "sent" when only sent is set', () => {
    expect(
      deriveEmailProgressStep(timestamps({ emailSentAt: '2026-01-01' }))
    ).toBe('sent')
  })

  it('prefers "clicked" over every earlier step when all are set', () => {
    expect(
      deriveEmailProgressStep(
        timestamps({
          emailSentAt: '2026-01-01',
          emailDeliveredAt: '2026-01-01',
          emailOpenedAt: '2026-01-01',
          emailClickedAt: '2026-01-01',
        })
      )
    ).toBe('clicked')
  })

  it('prefers "opened" over "delivered"/"sent" when clicked is not set', () => {
    expect(
      deriveEmailProgressStep(
        timestamps({
          emailSentAt: '2026-01-01',
          emailDeliveredAt: '2026-01-01',
          emailOpenedAt: '2026-01-01',
        })
      )
    ).toBe('opened')
  })

  it('does NOT consider bounced/complained as progress steps', () => {
    expect(
      deriveEmailProgressStep(
        timestamps({ emailSentAt: '2026-01-01', emailBouncedAt: '2026-01-02' })
      )
    ).toBe('sent')
  })
})

describe('deriveEmailFailure (complained takes precedence over bounced)', () => {
  it('returns null when there is no failure', () => {
    expect(deriveEmailFailure(timestamps())).toBeNull()
  })

  it('returns "bounced" when only bounced is set', () => {
    expect(
      deriveEmailFailure(timestamps({ emailBouncedAt: '2026-01-01' }))
    ).toBe('bounced')
  })

  it('returns "complained" over "bounced" when BOTH are set', () => {
    expect(
      deriveEmailFailure(
        timestamps({
          emailBouncedAt: '2026-01-01',
          emailComplainedAt: '2026-01-02',
        })
      )
    ).toBe('complained')
  })
})
