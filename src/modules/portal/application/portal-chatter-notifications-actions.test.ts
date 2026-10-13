import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  ackPortalNotificationAction,
  checkChatterNotificationsAction,
  checkPortalNotificationsAction,
  markChatterConversationSeenAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  filterNotificationsForWorker,
  maskStatsForWorker,
  resolveDirectoryActorId,
  loadClientPortalNotifications,
  fetchChatterReadStateForUser,
  upsertChatterReadState,
  isOdooApiConfigured,
  fetchWatchStateForUser,
  upsertWatchStateBatch,
  resolveWatchableAckStateFromSnapshots,
  verifyClientRecordAccess,
  resolveClientOdooPartnerId,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  filterNotificationsForWorker: vi.fn(),
  maskStatsForWorker: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  loadClientPortalNotifications: vi.fn(),
  fetchChatterReadStateForUser: vi.fn(),
  upsertChatterReadState: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  fetchWatchStateForUser: vi.fn(),
  upsertWatchStateBatch: vi.fn(),
  resolveWatchableAckStateFromSnapshots: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock(
  '@/src/modules/colaboradores/application/get-allowed-sections-for-worker',
  () => ({ getAllowedSectionsForWorker })
)
vi.mock('@/src/modules/colaboradores/application/mask-dashboard-for-worker', () => ({
  filterNotificationsForWorker,
  maskStatsForWorker,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({
  loadClientPortalNotifications,
}))
vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({
  fetchChatterReadStateForUser,
  upsertChatterReadState,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({
  fetchWatchStateForUser,
  upsertWatchStateBatch,
}))
vi.mock('@/src/modules/portal/infrastructure/resolve-watchable-ack-state', () => ({
  resolveWatchableAckStateFromSnapshots,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  verifyClientRecordAccess,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))

function sessionFor(role: 'client' | 'worker' | 'advisor' | 'admin'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

function okNotificationsResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    ok: true as const,
    unread: [],
    readState: {},
    pendingFirmaIds: [],
    hasChanges: false,
    stats: {
      activeTramitesAndConsultas: 1,
      obligacionesInProgress: 1,
      pendingSignatures: 1,
      nextObligacion: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): clearAllMocks only wipes call history and
  // leaves .mockResolvedValue/.mockReturnValue implementations from a previous
  // test in place, which can make a later test pass for the wrong reason.
  vi.resetAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  resolveDirectoryActorId.mockResolvedValue('actor-1')
})

describe('resolveClientAccess gate (shared by all actions in this file)', () => {
  it('returns forbidden when there is no session', async () => {
    getSession.mockResolvedValue(null)

    const result = await checkPortalNotificationsAction()

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('returns forbidden for a role that is neither client nor worker', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))

    const result = await checkPortalNotificationsAction()

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('returns not_linked when the user has no Odoo partner', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    resolveClientOdooPartnerId.mockResolvedValue(null)

    const result = await checkPortalNotificationsAction()

    expect(result).toMatchObject({ ok: false, error: 'not_linked' })
    expect(isOdooApiConfigured).not.toHaveBeenCalled()
  })

  it('returns odoo_unavailable when Odoo is not configured', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    isOdooApiConfigured.mockReturnValue(false)

    const result = await checkPortalNotificationsAction()

    expect(result).toMatchObject({ ok: false, error: 'odoo_unavailable' })
    expect(resolveDirectoryActorId).not.toHaveBeenCalled()
  })
})

describe('checkPortalNotificationsAction', () => {
  it('passes partnerId/actorId through to loadClientPortalNotifications with cache off and persist on', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    loadClientPortalNotifications.mockResolvedValue(okNotificationsResult())

    await checkPortalNotificationsAction()

    expect(loadClientPortalNotifications).toHaveBeenCalledWith({
      partnerId: 999,
      actorId: 'actor-1',
      cache: false,
      persist: true,
    })
  })

  it('never masks for a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    loadClientPortalNotifications.mockResolvedValue(okNotificationsResult())

    const result = await checkPortalNotificationsAction()

    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
    expect(maskStatsForWorker).not.toHaveBeenCalled()
    expect(filterNotificationsForWorker).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true })
  })

  it('masks stats and filters unread for a worker when the underlying load succeeds', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    const baseResult = okNotificationsResult({ unread: [{ scope: 'firma' }] })
    loadClientPortalNotifications.mockResolvedValue(baseResult)
    const allowedSections = new Set(['/tramites'])
    getAllowedSectionsForWorker.mockResolvedValue(allowedSections)
    maskStatsForWorker.mockReturnValue({ masked: true })
    filterNotificationsForWorker.mockReturnValue([{ filtered: true }])

    const result = await checkPortalNotificationsAction()

    expect(getAllowedSectionsForWorker).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'worker' })
    )
    expect(maskStatsForWorker).toHaveBeenCalledWith(baseResult.stats, allowedSections)
    expect(filterNotificationsForWorker).toHaveBeenCalledWith(
      baseResult.unread,
      allowedSections
    )
    expect(result).toMatchObject({
      ok: true,
      stats: { masked: true },
      unread: [{ filtered: true }],
    })
  })

  it('does not attempt to mask a worker result when the underlying load failed', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    loadClientPortalNotifications.mockResolvedValue({
      ok: false,
      error: 'odoo_unavailable',
    })

    const result = await checkPortalNotificationsAction()

    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})

describe('checkChatterNotificationsAction (deprecated alias)', () => {
  it('delegates to checkPortalNotificationsAction', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    loadClientPortalNotifications.mockResolvedValue(okNotificationsResult())

    const result = await checkChatterNotificationsAction()

    expect(result).toMatchObject({ ok: true })
    expect(loadClientPortalNotifications).toHaveBeenCalled()
  })
})

describe('markChatterConversationSeenAction', () => {
  it('propagates the access gate error without touching Odoo state', async () => {
    getSession.mockResolvedValue(null)

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 1,
      lastSeenMessageId: 10,
    })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(verifyClientRecordAccess).not.toHaveBeenCalled()
  })

  it.each([
    { recordId: 0, lastSeenMessageId: 10 },
    { recordId: -1, lastSeenMessageId: 10 },
    { recordId: 1.5, lastSeenMessageId: 10 },
    { recordId: 1, lastSeenMessageId: 0 },
    { recordId: 1, lastSeenMessageId: -1 },
  ])(
    'rejects invalid numeric input %j before ever calling verifyClientRecordAccess',
    async ({ recordId, lastSeenMessageId }) => {
      getSession.mockResolvedValue(sessionFor('client'))

      const result = await markChatterConversationSeenAction({
        kind: 'task',
        recordId,
        lastSeenMessageId,
      })

      expect(result).toMatchObject({ ok: false, error: 'not_found' })
      expect(verifyClientRecordAccess).not.toHaveBeenCalled()
    }
  )

  it('blocks when the record does not belong to the caller partner (tenant isolation)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(false)

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 42,
      lastSeenMessageId: 10,
    })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(verifyClientRecordAccess).toHaveBeenCalledWith('task', 42, 999)
    expect(fetchChatterReadStateForUser).not.toHaveBeenCalled()
  })

  it('advances the read state and persists it when lastSeenMessageId moves forward', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchChatterReadStateForUser.mockResolvedValue(new Map([['task:42', 5]]))

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 42,
      lastSeenMessageId: 10,
    })

    expect(upsertChatterReadState).toHaveBeenCalledWith('actor-1', 'task', 42, 10)
    expect(result).toEqual({ ok: true, readState: { 'task:42': 10 } })
  })

  it('does not write anything when the record was already seen at or past that message', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchChatterReadStateForUser.mockResolvedValue(new Map([['task:42', 20]]))

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 42,
      lastSeenMessageId: 10,
    })

    expect(upsertChatterReadState).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, readState: { 'task:42': 20 } })
  })

  it('surfaces a failure to read Odoo/Supabase state as odoo_unavailable', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchChatterReadStateForUser.mockRejectedValue(new Error('boom'))

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 42,
      lastSeenMessageId: 10,
    })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('surfaces a failure to persist the read state as odoo_unavailable', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchChatterReadStateForUser.mockResolvedValue(new Map())
    upsertChatterReadState.mockRejectedValue(new Error('boom'))

    const result = await markChatterConversationSeenAction({
      kind: 'task',
      recordId: 42,
      lastSeenMessageId: 10,
    })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})

describe('ackPortalNotificationAction', () => {
  it('propagates the access gate error', async () => {
    getSession.mockResolvedValue(null)

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 1,
      reason: 'status_change',
    })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
  })

  it.each([0, -1, 1.5])(
    'rejects an invalid recordId (%j) before any record-access check',
    async (recordId) => {
      getSession.mockResolvedValue(sessionFor('client'))

      const result = await ackPortalNotificationAction({
        scope: 'tramite',
        recordId,
        reason: 'status_change',
      })

      expect(result).toMatchObject({ ok: false, error: 'not_found' })
      expect(verifyClientRecordAccess).not.toHaveBeenCalled()
    }
  )

  it.each([
    { scope: 'tramite' as const, expectedKind: 'task' },
    { scope: 'consulta' as const, expectedKind: 'ticket' },
  ])(
    'maps scope "$scope" to the right record kind ($expectedKind) for ownership verification',
    async ({ scope, expectedKind }) => {
      getSession.mockResolvedValue(sessionFor('client'))
      verifyClientRecordAccess.mockResolvedValue(true)
      fetchWatchStateForUser.mockResolvedValue(new Map())

      await ackPortalNotificationAction({
        scope,
        recordId: 7,
        reason: 'unread_chatter',
      })

      expect(verifyClientRecordAccess).toHaveBeenCalledWith(expectedKind, 7, 999)
    }
  )

  it('blocks a tramite/consulta ack when the record is not the caller\'s (tenant isolation)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(false)

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'status_change',
    })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(fetchWatchStateForUser).not.toHaveBeenCalled()
  })

  it('verifies ownership as "task" for scope "obligacion" and blocks a foreign record', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(false)

    const result = await ackPortalNotificationAction({
      scope: 'obligacion',
      recordId: 9,
      reason: 'unread_chatter',
    })

    expect(verifyClientRecordAccess).toHaveBeenCalledWith('task', 9, 999)
    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(fetchWatchStateForUser).not.toHaveBeenCalled()
  })

  it('rejects reason "new_document" with a missing/invalid attachmentCount', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(new Map())

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'new_document',
    })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(upsertWatchStateBatch).not.toHaveBeenCalled()
  })

  it('upserts watch state for reason "new_document" carrying over previous flags', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(
      new Map([
        [
          'tramite:7',
          {
            lastState: 'done',
            lastIsClosed: true,
            lastAttachmentCount: 1,
            firmaDueSoonNotified: true,
            initialized: true,
          },
        ],
      ])
    )

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'new_document',
      attachmentCount: 3,
    })

    expect(upsertWatchStateBatch).toHaveBeenCalledWith('actor-1', [
      {
        scope: 'tramite',
        recordId: 7,
        lastState: 'done',
        lastIsClosed: true,
        lastAttachmentCount: 3,
        firmaDueSoonNotified: true,
        initialized: true,
      },
    ])
    expect(result).toEqual({ ok: true })
  })

  it.each([
    { reason: 'firma_due_soon' as const, expectFirmaDueSoonNotified: true },
    { reason: 'new_firma' as const, expectFirmaDueSoonNotified: false },
  ])(
    'upserts a "firma"-scoped watch row for reason "$reason"',
    async ({ reason, expectFirmaDueSoonNotified }) => {
      getSession.mockResolvedValue(sessionFor('client'))
      fetchWatchStateForUser.mockResolvedValue(new Map())

      const result = await ackPortalNotificationAction({
        scope: 'firma',
        recordId: 7,
        reason,
      })

      expect(upsertWatchStateBatch).toHaveBeenCalledWith('actor-1', [
        {
          scope: 'firma',
          recordId: 7,
          lastIsClosed: false,
          lastAttachmentCount: 0,
          firmaDueSoonNotified: expectFirmaDueSoonNotified,
          initialized: true,
        },
      ])
      expect(result).toEqual({ ok: true })
    }
  )

  it('blocks reason "status_change" when there is no matching snapshot to resolve the new state', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(new Map())
    resolveWatchableAckStateFromSnapshots.mockResolvedValue(null)

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'status_change',
    })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(upsertWatchStateBatch).not.toHaveBeenCalled()
  })

  it('upserts the resolved snapshot state for reason "status_change", preserving firmaDueSoonNotified', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(
      new Map([
        [
          'tramite:7',
          {
            lastState: 'old',
            lastIsClosed: false,
            lastAttachmentCount: 0,
            firmaDueSoonNotified: true,
            initialized: true,
          },
        ],
      ])
    )
    resolveWatchableAckStateFromSnapshots.mockResolvedValue({
      lastState: 'new',
      lastIsClosed: true,
      lastAttachmentCount: 2,
    })

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'status_change',
    })

    expect(resolveWatchableAckStateFromSnapshots).toHaveBeenCalledWith('tramite', 7, 999)
    expect(upsertWatchStateBatch).toHaveBeenCalledWith('actor-1', [
      {
        scope: 'tramite',
        recordId: 7,
        lastState: 'new',
        lastIsClosed: true,
        lastAttachmentCount: 2,
        firmaDueSoonNotified: true,
        initialized: true,
      },
    ])
    expect(result).toEqual({ ok: true })
  })

  it('does nothing and returns ok for an unhandled reason (e.g. unread_chatter)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(new Map())

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'unread_chatter',
    })

    expect(upsertWatchStateBatch).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })

  it('surfaces a watch-state read failure as odoo_unavailable', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockRejectedValue(new Error('boom'))

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'unread_chatter',
    })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('surfaces a watch-state write failure as odoo_unavailable', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    fetchWatchStateForUser.mockResolvedValue(new Map())
    upsertWatchStateBatch.mockRejectedValue(new Error('boom'))

    const result = await ackPortalNotificationAction({
      scope: 'tramite',
      recordId: 7,
      reason: 'new_firma',
    })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})
