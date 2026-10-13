import { describe, expect, it } from 'vitest'

import { deriveOnboardingTokenStatus } from '@/src/modules/onboarding/domain/onboarding-token-status'

const NOW = new Date('2026-06-01T00:00:00.000Z').getTime()

describe('deriveOnboardingTokenStatus (precedence: used > revoked > expired > active)', () => {
  it('is "used" when used_at is set, REGARDLESS of revoked_at or expiry', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: '2026-01-01T00:00:00.000Z',
        revoked_at: '2026-01-02T00:00:00.000Z',
        expires_at: '2020-01-01T00:00:00.000Z', // already expired
      },
      NOW
    )

    expect(status).toBe('used')
  })

  it('is "revoked" when revoked_at is set and used_at is not, REGARDLESS of expiry', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: null,
        revoked_at: '2026-01-02T00:00:00.000Z',
        expires_at: '2099-01-01T00:00:00.000Z', // still far from expiry
      },
      NOW
    )

    expect(status).toBe('revoked')
  })

  it('is "expired" when the expiry timestamp is in the past', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: null,
        revoked_at: null,
        expires_at: '2020-01-01T00:00:00.000Z',
      },
      NOW
    )

    expect(status).toBe('expired')
  })

  it('is "expired" at the EXACT boundary (expires_at === now)', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: null,
        revoked_at: null,
        expires_at: new Date(NOW).toISOString(),
      },
      NOW
    )

    expect(status).toBe('expired')
  })

  it('is "expired" (fail-safe) when expires_at is an unparseable date', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: null,
        revoked_at: null,
        expires_at: 'not-a-date',
      },
      NOW
    )

    expect(status).toBe('expired')
  })

  it('is "active" when unused, unrevoked, and not yet expired', () => {
    const status = deriveOnboardingTokenStatus(
      {
        used_at: null,
        revoked_at: null,
        expires_at: '2099-01-01T00:00:00.000Z',
      },
      NOW
    )

    expect(status).toBe('active')
  })

  it('defaults `now` to Date.now() when not given', () => {
    const status = deriveOnboardingTokenStatus({
      used_at: null,
      revoked_at: null,
      expires_at: '2099-01-01T00:00:00.000Z',
    })

    expect(status).toBe('active')
  })
})
