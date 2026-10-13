import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalRole, PortalUser } from '@/src/modules/auth/domain/types'
import type { PortalNotificationsCheckResult } from '@/src/modules/portal/domain/portal-notifications-types'
import { getClientHomeData } from '@/src/modules/portal/application/get-client-home-data'

const {
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  resolveDirectoryActorId,
  loadClientPortalNotifications,
  getAllowedSectionsForWorker,
} = vi.hoisted(() => ({
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  loadClientPortalNotifications: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
}))

vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
  resolveOdooErrorCode: (error: unknown) =>
    error instanceof Error && error.message === 'RATE_LIMITED'
      ? 'odoo_rate_limited'
      : 'odoo_unavailable',
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({
  loadClientPortalNotifications,
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))

function userFor(role: PortalRole): PortalUser {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

function okNotifications(
  overrides: Partial<Extract<PortalNotificationsCheckResult, { ok: true }>> = {}
): Extract<PortalNotificationsCheckResult, { ok: true }> {
  return {
    ok: true,
    unread: [],
    readState: {},
    pendingFirmaIds: [],
    hasChanges: false,
    stats: {
      activeTramitesAndConsultas: 2,
      obligacionesInProgress: 3,
      pendingSignatures: 4,
      nextObligacion: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(123)
  isOdooApiConfigured.mockReturnValue(true)
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  getAllowedSectionsForWorker.mockResolvedValue(new Set())
})

describe('getClientHomeData', () => {
  it('rejects admin/advisor roles before resolving any Odoo partner id', async () => {
    for (const role of ['admin', 'advisor'] as const) {
      const result = await getClientHomeData(userFor(role))
      expect(result).toEqual({
        snapshot: null,
        snapshotError: 'forbidden',
        notifications: { ok: false, error: 'forbidden' },
      })
    }
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('returns not_linked without resolving the actor id when there is no Odoo partner id', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)

    const result = await getClientHomeData(userFor('client'))

    expect(result).toEqual({
      snapshot: null,
      snapshotError: 'not_linked',
      notifications: { ok: false, error: 'not_linked' },
    })
    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
  })

  it('returns odoo_unavailable without resolving the actor id when Odoo is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    const result = await getClientHomeData(userFor('client'))

    expect(result).toEqual({
      snapshot: null,
      snapshotError: 'odoo_unavailable',
      notifications: { ok: false, error: 'odoo_unavailable' },
    })
    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
  })

  it('passes through unmasked snapshot/notifications for a client, fetching fresh uncached non-persisted notifications', async () => {
    const notifications = okNotifications()
    loadClientPortalNotifications.mockResolvedValue(notifications)

    const result = await getClientHomeData(userFor('client'))

    expect(result).toEqual({
      snapshot: notifications.stats,
      snapshotError: null,
      notifications,
    })
    expect(loadClientPortalNotifications).toHaveBeenCalledWith({
      partnerId: 123,
      actorId: 'actor-1',
      cache: false,
      persist: false,
    })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('surfaces a notifications-layer error for a client, unmasked', async () => {
    loadClientPortalNotifications.mockResolvedValue({ ok: false, error: 'odoo_rate_limited' })

    const result = await getClientHomeData(userFor('client'))

    expect(result).toEqual({
      snapshot: null,
      snapshotError: 'odoo_rate_limited',
      notifications: { ok: false, error: 'odoo_rate_limited' },
    })
  })

  it('masks stats and filters unread notifications for a worker when the notifications fetch succeeds', async () => {
    const notifications = okNotifications({
      unread: [
        {
          scope: 'tramite',
          recordId: 1,
          name: 'T1',
          reason: 'new_tramite',
          latestDate: '2026-01-01',
        },
        {
          scope: 'firma',
          recordId: 2,
          name: 'F1',
          reason: 'new_firma',
          latestDate: '2026-01-02',
        },
      ],
    })
    loadClientPortalNotifications.mockResolvedValue(notifications)
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await getClientHomeData(userFor('worker'))

    expect(result.snapshotError).toBeNull()
    expect(result.snapshot).toEqual({
      activeTramitesAndConsultas: 2,
      obligacionesInProgress: 0,
      pendingSignatures: 0,
      nextObligacion: null,
    })
    expect(result.notifications?.ok).toBe(true)
    if (result.notifications?.ok) {
      expect(result.notifications.unread).toEqual([
        {
          scope: 'tramite',
          recordId: 1,
          name: 'T1',
          reason: 'new_tramite',
          latestDate: '2026-01-01',
        },
      ])
    }
  })

  it('does not attempt to mask when a worker notifications fetch itself failed', async () => {
    loadClientPortalNotifications.mockResolvedValue({ ok: false, error: 'odoo_unavailable' })

    const result = await getClientHomeData(userFor('worker'))

    expect(result).toEqual({
      snapshot: null,
      snapshotError: 'odoo_unavailable',
      notifications: { ok: false, error: 'odoo_unavailable' },
    })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('maps a thrown error from loadClientPortalNotifications via resolveOdooErrorCode', async () => {
    loadClientPortalNotifications.mockRejectedValue(new Error('RATE_LIMITED'))

    const result = await getClientHomeData(userFor('client'))

    expect(result).toEqual({
      snapshot: null,
      snapshotError: 'odoo_rate_limited',
      notifications: { ok: false, error: 'odoo_rate_limited' },
    })
  })
})
