import { describe, expect, it } from 'vitest'

import { buildOnboardingSolicitudStats } from '@/src/modules/onboarding/domain/onboarding-solicitud-stats'
import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'

function row(overrides: Partial<OnboardingSolicitudRow> = {}): OnboardingSolicitudRow {
  return {
    token: 'tok',
    status: 'active',
    recipientEmail: 'x@example.com',
    recipientName: 'X',
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    url: 'https://example.com/tok',
    resendEmailId: null,
    emailSentAt: null,
    emailDeliveredAt: null,
    emailOpenedAt: null,
    emailClickedAt: null,
    emailBouncedAt: null,
    emailComplainedAt: null,
    emailSubject: null,
    emailHtml: null,
    ...overrides,
  }
}

describe('buildOnboardingSolicitudStats', () => {
  it('ignores non-active rows (used/revoked/expired) entirely', () => {
    const stats = buildOnboardingSolicitudStats([
      row({ status: 'used', emailClickedAt: '2026-01-01' }),
      row({ status: 'revoked' }),
      row({ status: 'expired' }),
    ])

    expect(stats).toEqual({
      pendingClicked: 0,
      pendingReceived: 0,
      pendingFailed: 0,
    })
  })

  it('counts an active row with no email activity as pendingReceived (not failed, not clicked)', () => {
    const stats = buildOnboardingSolicitudStats([row({ status: 'active' })])

    expect(stats).toEqual({
      pendingClicked: 0,
      pendingReceived: 1,
      pendingFailed: 0,
    })
  })

  it('counts a clicked active row as pendingClicked, NOT pendingReceived', () => {
    const stats = buildOnboardingSolicitudStats([
      row({ status: 'active', emailSentAt: '2026-01-01', emailClickedAt: '2026-01-02' }),
    ])

    expect(stats).toEqual({
      pendingClicked: 1,
      pendingReceived: 0,
      pendingFailed: 0,
    })
  })

  it('a bounced/complained active row counts as pendingFailed, even if it was also clicked', () => {
    const stats = buildOnboardingSolicitudStats([
      row({
        status: 'active',
        emailClickedAt: '2026-01-02',
        emailBouncedAt: '2026-01-03',
      }),
    ])

    expect(stats).toEqual({
      pendingClicked: 0,
      pendingReceived: 0,
      pendingFailed: 1,
    })
  })

  it('tallies a mixed batch correctly', () => {
    const stats = buildOnboardingSolicitudStats([
      row({ status: 'active' }), // received (nothing happened)
      row({ status: 'active', emailSentAt: '2026-01-01' }), // received
      row({ status: 'active', emailClickedAt: '2026-01-01' }), // clicked
      row({ status: 'active', emailBouncedAt: '2026-01-01' }), // failed
      row({ status: 'used', emailClickedAt: '2026-01-01' }), // ignored
    ])

    expect(stats).toEqual({
      pendingClicked: 1,
      pendingReceived: 2,
      pendingFailed: 1,
    })
  })
})
