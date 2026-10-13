import { describe, expect, it, vi, beforeEach } from 'vitest'

import { loadClientPortalNotifications } from '@/src/modules/portal/application/load-client-portal-notifications'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import type { ObligacionNotificationLeaf } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-notification-snapshot'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'

const {
  revalidateTag,
  computeFirmaWatchDeltas,
  computeRecordWatchDeltas,
  mergeAndSortPortalNotifications,
  portalNotificationFromTramiteListItem,
  watchableFromTramiteListItem,
  chatterReadStateKey,
  listKindFromRecordKind,
  isTaskClosed,
  resolveOdooErrorCode,
  getCachedTramitesSnapshotSafe,
  getFreshTramitesSnapshotSafe,
  getCachedObligacionNotificationSnapshotSafe,
  getFreshObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
  getFreshPendingSignaturesSnapshotSafe,
  getCachedUnreadChatterCandidates,
  getFreshUnreadChatterCandidates,
  tramitesSnapshotCacheTag,
  getOdooModelForRecordKind,
  fetchChatterReadStateForUser,
  upsertChatterReadStateBatch,
  fetchWatchStateForUser,
  upsertWatchStateBatch,
  ensureTramitesListSeenInitialized,
  fetchTramitesListSeenState,
  getTramiteListItemKey,
  getTramiteListRecordKind,
  mergeTramitesList,
  computeNewTramiteListItemKeys,
  getOpenTramiteListItemKeys,
} = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  computeFirmaWatchDeltas: vi.fn(),
  computeRecordWatchDeltas: vi.fn(),
  mergeAndSortPortalNotifications: vi.fn(),
  portalNotificationFromTramiteListItem: vi.fn(),
  watchableFromTramiteListItem: vi.fn(),
  chatterReadStateKey: vi.fn(),
  listKindFromRecordKind: vi.fn(),
  isTaskClosed: vi.fn(),
  resolveOdooErrorCode: vi.fn(),
  getCachedTramitesSnapshotSafe: vi.fn(),
  getFreshTramitesSnapshotSafe: vi.fn(),
  getCachedObligacionNotificationSnapshotSafe: vi.fn(),
  getFreshObligacionNotificationSnapshotSafe: vi.fn(),
  getCachedPendingSignaturesSnapshotSafe: vi.fn(),
  getFreshPendingSignaturesSnapshotSafe: vi.fn(),
  getCachedUnreadChatterCandidates: vi.fn(),
  getFreshUnreadChatterCandidates: vi.fn(),
  tramitesSnapshotCacheTag: vi.fn(),
  getOdooModelForRecordKind: vi.fn(),
  fetchChatterReadStateForUser: vi.fn(),
  upsertChatterReadStateBatch: vi.fn(),
  fetchWatchStateForUser: vi.fn(),
  upsertWatchStateBatch: vi.fn(),
  ensureTramitesListSeenInitialized: vi.fn(),
  fetchTramitesListSeenState: vi.fn(),
  getTramiteListItemKey: vi.fn(),
  getTramiteListRecordKind: vi.fn(),
  mergeTramitesList: vi.fn(),
  computeNewTramiteListItemKeys: vi.fn(),
  getOpenTramiteListItemKeys: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidateTag }))

vi.mock('@/src/modules/portal/domain/compute-portal-notifications', () => ({
  computeFirmaWatchDeltas,
  computeRecordWatchDeltas,
  mergeAndSortPortalNotifications,
  portalNotificationFromTramiteListItem,
  watchableFromTramiteListItem,
}))

vi.mock('@/src/modules/portal/domain/portal-notifications-types', () => ({
  chatterReadStateKey,
  listKindFromRecordKind,
}))

vi.mock('@/src/modules/tramites/domain/map-task-state', () => ({ isTaskClosed }))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  resolveOdooErrorCode,
}))

vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
  getCachedTramitesSnapshotSafe,
  getCachedUnreadChatterCandidates,
  getFreshObligacionNotificationSnapshotSafe,
  getFreshPendingSignaturesSnapshotSafe,
  getFreshTramitesSnapshotSafe,
  getFreshUnreadChatterCandidates,
  tramitesSnapshotCacheTag,
}))

vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  getOdooModelForRecordKind,
}))

vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({
  fetchChatterReadStateForUser,
  upsertChatterReadStateBatch,
}))

vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({
  fetchWatchStateForUser,
  upsertWatchStateBatch,
}))

vi.mock('@/src/modules/tramites/application/tramites-list-seen-loader', () => ({
  ensureTramitesListSeenInitialized,
}))

vi.mock('@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase', () => ({
  fetchTramitesListSeenState,
}))

vi.mock('@/src/modules/tramites/domain/merge-tramites-list', () => ({
  getTramiteListItemKey,
  getTramiteListRecordKind,
  mergeTramitesList,
}))

vi.mock('@/src/modules/tramites/domain/tramites-list-seen-state', () => ({
  computeNewTramiteListItemKeys,
  getOpenTramiteListItemKeys,
}))

const PARTNER_ID = 999
const ACTOR_ID = 'actor-1'

function tramiteItem(overrides: Partial<TramiteListItem> = {}): TramiteListItem {
  return {
    id: 1,
    name: 'Tramite 1',
    kind: 'tramite',
    state: '01_in_progress',
    isClosed: false,
    attachmentCount: 0,
    modifiedAt: '2024-01-01T00:00:00Z',
    assignedNotifyPartnerIds: [],
    ...overrides,
  }
}

function obligLeaf(
  overrides: Partial<ObligacionNotificationLeaf> = {}
): ObligacionNotificationLeaf {
  return {
    id: 100,
    name: 'Obligacion 1',
    displayLabel: 'Obligacion 1',
    state: '01_in_progress',
    modifiedAt: '2024-01-01T00:00:00Z',
    attachmentCount: 0,
    ...overrides,
  }
}

function firmaRequest(
  overrides: Partial<PendingSignatureRequest> = {}
): PendingSignatureRequest {
  return {
    id: 200,
    reference: 'FIRMA-1',
    signUrl: 'https://example.com/sign',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()

  // Pure/deterministic defaults mirroring the real implementations, so
  // orchestration logic in the file under test can be exercised faithfully
  // without pulling in the real (separately-tested) domain modules.
  getTramiteListRecordKind.mockImplementation((item: TramiteListItem) =>
    item.kind === 'tramite' ? 'task' : 'ticket'
  )
  getTramiteListItemKey.mockImplementation(
    (item: TramiteListItem) => `${item.kind}-${item.id}`
  )
  chatterReadStateKey.mockImplementation(
    (kind: string, id: number) => `${kind}:${id}`
  )
  listKindFromRecordKind.mockImplementation((kind: string) =>
    kind === 'task' ? 'tramite' : 'consulta'
  )
  isTaskClosed.mockImplementation((state?: string) =>
    Boolean(
      state &&
        ['1_done', 'done', '1_canceled', 'canceled', 'cancelled'].includes(
          state
        )
    )
  )
  getOpenTramiteListItemKeys.mockImplementation((items: TramiteListItem[]) =>
    items.filter((item) => !item.isClosed).map((item) => `${item.kind}-${item.id}`)
  )
  getOdooModelForRecordKind.mockImplementation((kind: string) =>
    kind === 'task' ? 'project.task' : 'helpdesk.ticket'
  )
  resolveOdooErrorCode.mockReturnValue('odoo_unavailable')
  tramitesSnapshotCacheTag.mockImplementation(
    (partnerId: number) => `tramites-snapshot:${partnerId}`
  )

  mergeTramitesList.mockReturnValue([])
  computeNewTramiteListItemKeys.mockReturnValue([])

  mergeAndSortPortalNotifications.mockImplementation((...groups: unknown[][]) =>
    groups.flat()
  )
  portalNotificationFromTramiteListItem.mockImplementation(
    (item: TramiteListItem, reason: string) => ({
      scope: item.kind,
      recordId: item.id,
      name: item.name,
      reason,
      latestDate: item.modifiedAt,
    })
  )
  watchableFromTramiteListItem.mockImplementation((item: TramiteListItem) => ({
    scope: item.kind,
    recordId: item.id,
    name: item.name,
    state: item.state,
    isClosed: item.isClosed,
    attachmentCount: item.attachmentCount,
    modifiedAt: item.modifiedAt,
  }))
  computeRecordWatchDeltas.mockReturnValue({ notifications: [], watchUpdates: [] })
  computeFirmaWatchDeltas.mockReturnValue({ notifications: [], watchUpdates: [] })

  fetchChatterReadStateForUser.mockResolvedValue(new Map())
  fetchWatchStateForUser.mockResolvedValue(new Map())
  fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: true })
  ensureTramitesListSeenInitialized.mockResolvedValue({
    openItemKeys: [],
    initialized: true,
  })
  upsertChatterReadStateBatch.mockResolvedValue(undefined)
  upsertWatchStateBatch.mockResolvedValue(undefined)

  getCachedTramitesSnapshotSafe.mockResolvedValue({
    data: { tasks: [], tickets: [], tagFilterActive: false },
  })
  getFreshTramitesSnapshotSafe.mockResolvedValue({
    data: { tasks: [], tickets: [], tagFilterActive: false },
  })
  getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({ data: { leaves: [] } })
  getFreshObligacionNotificationSnapshotSafe.mockResolvedValue({ data: { leaves: [] } })
  getCachedPendingSignaturesSnapshotSafe.mockResolvedValue({ data: { requests: [] } })
  getFreshPendingSignaturesSnapshotSafe.mockResolvedValue({ data: { requests: [] } })
  getCachedUnreadChatterCandidates.mockResolvedValue({ unread: [], bootstrapUpdates: [] })
  getFreshUnreadChatterCandidates.mockResolvedValue({ unread: [], bootstrapUpdates: [] })
})

describe('loadClientPortalNotifications — cache vs fresh loader selection', () => {
  it('uses the cached loaders when cache is not set to false, and never touches the fresh ones', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem()])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getCachedObligacionNotificationSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getCachedPendingSignaturesSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getCachedUnreadChatterCandidates).toHaveBeenCalled()
    expect(getFreshTramitesSnapshotSafe).not.toHaveBeenCalled()
    expect(getFreshObligacionNotificationSnapshotSafe).not.toHaveBeenCalled()
    expect(getFreshPendingSignaturesSnapshotSafe).not.toHaveBeenCalled()
    expect(getFreshUnreadChatterCandidates).not.toHaveBeenCalled()
  })

  it('uses the fresh loaders when cache:false is passed, and never touches the cached ones', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem()])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      cache: false,
    })

    expect(result.ok).toBe(true)
    expect(getFreshTramitesSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getFreshObligacionNotificationSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getFreshPendingSignaturesSnapshotSafe).toHaveBeenCalledWith(PARTNER_ID)
    expect(getFreshUnreadChatterCandidates).toHaveBeenCalled()
    expect(getCachedTramitesSnapshotSafe).not.toHaveBeenCalled()
    expect(getCachedObligacionNotificationSnapshotSafe).not.toHaveBeenCalled()
    expect(getCachedPendingSignaturesSnapshotSafe).not.toHaveBeenCalled()
    expect(getCachedUnreadChatterCandidates).not.toHaveBeenCalled()
  })
})

describe('loadClientPortalNotifications — persist gate on the seen-state baseline', () => {
  it('does not initialize the baseline when persist is not set (SSR/preview)', async () => {
    fetchTramitesListSeenState.mockResolvedValue(null)

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(ensureTramitesListSeenInitialized).not.toHaveBeenCalled()
    expect(fetchTramitesListSeenState).toHaveBeenCalledWith(ACTOR_ID)
    // portalBaselineComplete falls back to false when there is no row at all.
    expect(computeRecordWatchDeltas).toHaveBeenCalledWith(
      expect.objectContaining({ portalBaselineComplete: false })
    )
  })

  it('initializes the baseline from open item keys when persist:true', async () => {
    const openItem = tramiteItem({ id: 7, isClosed: false })
    mergeTramitesList.mockReturnValue([openItem])
    fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: false })
    ensureTramitesListSeenInitialized.mockResolvedValue({
      openItemKeys: ['tramite-7'],
      initialized: true,
    })

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(fetchTramitesListSeenState).toHaveBeenCalledWith(ACTOR_ID)
    expect(ensureTramitesListSeenInitialized).toHaveBeenCalledWith(ACTOR_ID, [
      'tramite-7',
    ])
  })

  it('marks the baseline as newly initialized (hasChanges) only when it transitions from not-initialized to initialized', async () => {
    fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: false })
    ensureTramitesListSeenInitialized.mockResolvedValue({
      openItemKeys: [],
      initialized: true,
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(result.ok).toBe(true)
    expect(result).toMatchObject({ hasChanges: true })
  })

  it('does NOT report hasChanges from the baseline when it was already initialized before this call', async () => {
    fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: true })
    ensureTramitesListSeenInitialized.mockResolvedValue({
      openItemKeys: [],
      initialized: true,
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(result).toMatchObject({ hasChanges: false })
  })
})

describe('loadClientPortalNotifications — building chatter groups from open items only', () => {
  it('does not call the chatter loader at all when there are no open items', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ isClosed: true, kind: 'tramite' })])

    await loadClientPortalNotifications({ partnerId: PARTNER_ID, actorId: ACTOR_ID })

    expect(getCachedUnreadChatterCandidates).not.toHaveBeenCalled()
  })

  it('builds a single "task" group for open trámites and resolves its resModel', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, kind: 'tramite', isClosed: false })])

    await loadClientPortalNotifications({ partnerId: PARTNER_ID, actorId: ACTOR_ID })

    expect(getOdooModelForRecordKind).toHaveBeenCalledWith('task')
    expect(getCachedUnreadChatterCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [
          expect.objectContaining({
            resModel: 'project.task',
            recordKind: 'task',
            records: [{ recordId: 1 }],
          }),
        ],
      })
    )
  })

  it('builds a single "ticket" group for open consultas and resolves its resModel', async () => {
    mergeTramitesList.mockReturnValue([
      tramiteItem({ id: 2, kind: 'consulta', isClosed: false }),
    ])

    await loadClientPortalNotifications({ partnerId: PARTNER_ID, actorId: ACTOR_ID })

    expect(getOdooModelForRecordKind).toHaveBeenCalledWith('ticket')
    expect(getCachedUnreadChatterCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [
          expect.objectContaining({
            resModel: 'helpdesk.ticket',
            recordKind: 'ticket',
            records: [{ recordId: 2 }],
          }),
        ],
      })
    )
  })

  it('swallows chatter loader errors so the rest of the notifications still load', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, isClosed: false })])
    getCachedUnreadChatterCandidates.mockRejectedValue(new Error('odoo down'))

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.unread).toEqual([])
    }
  })
})

describe('loadClientPortalNotifications — chatter bootstrap persistence gate', () => {
  it('persists bootstrap updates and advances the local readState only when persist:true', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, isClosed: false })])
    getCachedUnreadChatterCandidates.mockResolvedValue({
      unread: [],
      bootstrapUpdates: [{ recordKind: 'task', recordId: 1, lastSeenMessageId: 55 }],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(upsertChatterReadStateBatch).toHaveBeenCalledWith(ACTOR_ID, [
      { recordKind: 'task', recordId: 1, lastSeenMessageId: 55 },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.readState).toEqual({ 'task:1': 55 })
    }
  })

  it('does NOT persist bootstrap updates nor advance readState when persist is not set', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, isClosed: false })])
    getCachedUnreadChatterCandidates.mockResolvedValue({
      unread: [],
      bootstrapUpdates: [{ recordKind: 'task', recordId: 1, lastSeenMessageId: 55 }],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(upsertChatterReadStateBatch).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.readState).toEqual({})
    }
  })
})

describe('loadClientPortalNotifications — mapping unread chatter candidates to notifications', () => {
  it('maps a chatter candidate for a known open ref, including its name and listKind', async () => {
    mergeTramitesList.mockReturnValue([
      tramiteItem({ id: 1, kind: 'tramite', name: 'Alta trabajador', isClosed: false }),
    ])
    getCachedUnreadChatterCandidates.mockResolvedValue({
      unread: [{ recordKind: 'task', recordId: 1, latestDate: '2024-05-01', latestMessageId: 9 }],
      bootstrapUpdates: [],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.unread).toEqual([
        expect.objectContaining({
          scope: 'tramite',
          recordId: 1,
          name: 'Alta trabajador',
          reason: 'unread_chatter',
          listKind: 'tramite',
          latestMessageId: 9,
        }),
      ])
    }
  })

  it('drops a chatter candidate whose record is not among the open refs (e.g. now closed)', async () => {
    // Record 1 is closed, so it never enters `refs`; a stray chatter candidate for it must be dropped.
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, kind: 'tramite', isClosed: true })])
    getCachedUnreadChatterCandidates.mockResolvedValue({
      unread: [{ recordKind: 'task', recordId: 1, latestDate: '2024-05-01', latestMessageId: 9 }],
      bootstrapUpdates: [],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.unread).toEqual([])
    }
  })
})

describe('loadClientPortalNotifications — new trámite notifications', () => {
  it('reports new_tramite only for an open item of kind "tramite" whose key is new', async () => {
    const item = tramiteItem({ id: 3, kind: 'tramite', isClosed: false })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue(['tramite-3'])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(portalNotificationFromTramiteListItem).toHaveBeenCalledWith(item, 'new_tramite')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.unread).toEqual([
        expect.objectContaining({ scope: 'tramite', recordId: 3, reason: 'new_tramite' }),
      ])
    }
  })

  it('does not report new_tramite for a closed item even if its key is "new"', async () => {
    const item = tramiteItem({ id: 3, kind: 'tramite', isClosed: true })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue(['tramite-3'])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(portalNotificationFromTramiteListItem).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.unread.filter((n) => n.reason === 'new_tramite')).toEqual([])
    }
  })

  it('does not report new_tramite for a consulta (ticket) even if its key is "new"', async () => {
    const item = tramiteItem({ id: 4, kind: 'consulta', isClosed: false })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue(['consulta-4'])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(portalNotificationFromTramiteListItem).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })

  it('does not report new_tramite when the key is absent from the "new" set', async () => {
    const item = tramiteItem({ id: 5, kind: 'tramite', isClosed: false })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue([])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(portalNotificationFromTramiteListItem).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
  })
})

describe('loadClientPortalNotifications — tramitesChanged cache invalidation', () => {
  it('revalidates the tramites snapshot tag when a status-change notification scope is "tramite" and persist:true', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'tramite', recordId: 1, name: 'x', reason: 'status_change', latestDate: 'd' }],
      watchUpdates: [],
    })

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(tramitesSnapshotCacheTag).toHaveBeenCalledWith(PARTNER_ID)
    expect(revalidateTag).toHaveBeenCalledWith(`tramites-snapshot:${PARTNER_ID}`, {
      expire: 0,
    })
  })

  it('revalidates the tramites snapshot tag when the changed scope is "consulta" too', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'consulta', recordId: 1, name: 'x', reason: 'status_change', latestDate: 'd' }],
      watchUpdates: [],
    })

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(revalidateTag).toHaveBeenCalled()
  })

  it('does NOT revalidate the tramites snapshot tag when the only changed scope is "obligacion"', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'obligacion', recordId: 1, name: 'x', reason: 'status_change', latestDate: 'd' }],
      watchUpdates: [],
    })

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('does NOT revalidate when persist is not set, even if tramites changed', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'tramite', recordId: 1, name: 'x', reason: 'status_change', latestDate: 'd' }],
      watchUpdates: [],
    })

    await loadClientPortalNotifications({ partnerId: PARTNER_ID, actorId: ACTOR_ID })

    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates when a brand-new trámite notification exists, even with no recordDeltas changes', async () => {
    const item = tramiteItem({ id: 9, kind: 'tramite', isClosed: false })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue(['tramite-9'])

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(revalidateTag).toHaveBeenCalled()
  })
})

describe('loadClientPortalNotifications — watch-state persistence gate', () => {
  it('persists combined record + firma watch updates (in that order) only when persist:true', async () => {
    const recordUpdate = { scope: 'tramite' as const, recordId: 1, lastIsClosed: false, lastAttachmentCount: 0, firmaDueSoonNotified: false, initialized: true }
    const firmaUpdate = { scope: 'firma' as const, recordId: 2, lastIsClosed: false, lastAttachmentCount: 0, firmaDueSoonNotified: false, initialized: true }
    computeRecordWatchDeltas.mockReturnValue({ notifications: [], watchUpdates: [recordUpdate] })
    computeFirmaWatchDeltas.mockReturnValue({ notifications: [], watchUpdates: [firmaUpdate] })

    await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(upsertWatchStateBatch).toHaveBeenCalledWith(ACTOR_ID, [recordUpdate, firmaUpdate])
  })

  it('does NOT persist watch updates when persist is not set', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [],
      watchUpdates: [
        { scope: 'tramite', recordId: 1, lastIsClosed: false, lastAttachmentCount: 0, firmaDueSoonNotified: false, initialized: true },
      ],
    })

    await loadClientPortalNotifications({ partnerId: PARTNER_ID, actorId: ACTOR_ID })

    expect(upsertWatchStateBatch).not.toHaveBeenCalled()
  })
})

describe('loadClientPortalNotifications — allOdooFailed guard', () => {
  it('returns odoo_unavailable when all three sources fail AND all snapshots are empty', async () => {
    getCachedTramitesSnapshotSafe.mockResolvedValue({
      data: { tasks: [], tickets: [], tagFilterActive: false },
      odooError: 'odoo_unavailable',
    })
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: { leaves: [] },
      odooError: 'odoo_unavailable',
    })
    getCachedPendingSignaturesSnapshotSafe.mockResolvedValue({
      data: { requests: [] },
      odooError: 'odoo_rate_limited',
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(upsertWatchStateBatch).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('returns odoo_rate_limited specifically when every failing source is rate-limited', async () => {
    getCachedTramitesSnapshotSafe.mockResolvedValue({
      data: { tasks: [], tickets: [], tagFilterActive: false },
      odooError: 'odoo_rate_limited',
    })
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: { leaves: [] },
      odooError: 'odoo_rate_limited',
    })
    getCachedPendingSignaturesSnapshotSafe.mockResolvedValue({
      data: { requests: [] },
      odooError: 'odoo_rate_limited',
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
  })

  it('does NOT short-circuit when only two of the three sources fail', async () => {
    getCachedTramitesSnapshotSafe.mockResolvedValue({
      data: { tasks: [], tickets: [], tagFilterActive: false },
      odooError: 'odoo_unavailable',
    })
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: { leaves: [] },
      odooError: 'odoo_unavailable',
    })
    // firmas succeeded.

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
  })

  it('does NOT short-circuit when all three fail but there is still data (non-empty items)', async () => {
    mergeTramitesList.mockReturnValue([tramiteItem({ id: 1, isClosed: false })])
    getCachedTramitesSnapshotSafe.mockResolvedValue({
      data: { tasks: [], tickets: [], tagFilterActive: false },
      odooError: 'odoo_unavailable',
    })
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: { leaves: [] },
      odooError: 'odoo_unavailable',
    })
    getCachedPendingSignaturesSnapshotSafe.mockResolvedValue({
      data: { requests: [] },
      odooError: 'odoo_unavailable',
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
  })
})

describe('loadClientPortalNotifications — stats computation', () => {
  it('counts only open items as activeTramitesAndConsultas', async () => {
    mergeTramitesList.mockReturnValue([
      tramiteItem({ id: 1, isClosed: false }),
      tramiteItem({ id: 2, isClosed: true }),
    ])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.stats.activeTramitesAndConsultas).toBe(1)
    }
  })

  it('excludes closed obligación leaves from obligacionesInProgress and from nextObligacion', async () => {
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: {
        leaves: [
          obligLeaf({ id: 1, state: '1_done', deadline: '2024-01-01' }),
          obligLeaf({ id: 2, state: '01_in_progress', deadline: '2024-06-01' }),
        ],
      },
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.stats.obligacionesInProgress).toBe(1)
      expect(result.stats.nextObligacion).toEqual({
        name: 'Obligacion 1',
        deadline: '2024-06-01',
      })
    }
  })

  it('picks the EARLIEST deadline among open obligaciones for nextObligacion', async () => {
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: {
        leaves: [
          obligLeaf({
            id: 1,
            name: 'Later',
            displayLabel: 'Later',
            state: '01_in_progress',
            deadline: '2024-12-01',
          }),
          obligLeaf({
            id: 2,
            name: 'Sooner',
            displayLabel: 'Sooner',
            state: '01_in_progress',
            deadline: '2024-02-01',
          }),
        ],
      },
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.stats.nextObligacion).toEqual({ name: 'Sooner', deadline: '2024-02-01' })
    }
  })

  it('excludes open obligaciones without a deadline from nextObligacion candidates', async () => {
    getCachedObligacionNotificationSnapshotSafe.mockResolvedValue({
      data: {
        leaves: [obligLeaf({ id: 1, state: '01_in_progress', deadline: undefined })],
      },
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.stats.nextObligacion).toBeNull()
    }
  })

  it('reports pendingSignatures and pendingFirmaIds from the firmas snapshot requests', async () => {
    getCachedPendingSignaturesSnapshotSafe.mockResolvedValue({
      data: { requests: [firmaRequest({ id: 11 }), firmaRequest({ id: 12 })] },
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.stats.pendingSignatures).toBe(2)
      expect(result.pendingFirmaIds).toEqual([11, 12])
    }
  })
})

describe('loadClientPortalNotifications — hasChanges', () => {
  it('is false for a fully quiet poll with no notifications and no persisted side effects', async () => {
    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
      persist: true,
    })

    expect(result).toMatchObject({ ok: true, hasChanges: false })
  })

  it('is true when recordDeltas produced notifications', async () => {
    computeRecordWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'obligacion', recordId: 1, name: 'x', reason: 'new_document', latestDate: 'd' }],
      watchUpdates: [],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result).toMatchObject({ hasChanges: true })
  })

  it('is true when firmaDeltas produced notifications', async () => {
    computeFirmaWatchDeltas.mockReturnValue({
      notifications: [{ scope: 'firma', recordId: 1, name: 'x', reason: 'firma_due_soon', latestDate: 'd' }],
      watchUpdates: [],
    })

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result).toMatchObject({ hasChanges: true })
  })

  it('is true when there are new trámite notifications even with no persisted side effects', async () => {
    const item = tramiteItem({ id: 9, kind: 'tramite', isClosed: false })
    mergeTramitesList.mockReturnValue([item])
    computeNewTramiteListItemKeys.mockReturnValue(['tramite-9'])

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result).toMatchObject({ hasChanges: true })
  })
})

describe('loadClientPortalNotifications — top-level error handling', () => {
  it('maps an unexpected rejection (e.g. from Supabase watch-state fetch) to the resolved odoo error code', async () => {
    const boom = new Error('connection refused')
    fetchWatchStateForUser.mockRejectedValue(boom)
    resolveOdooErrorCode.mockReturnValue('odoo_rate_limited')

    const result = await loadClientPortalNotifications({
      partnerId: PARTNER_ID,
      actorId: ACTOR_ID,
    })

    expect(result).toEqual({ ok: false, error: 'odoo_rate_limited' })
    expect(resolveOdooErrorCode).toHaveBeenCalledWith(boom)
  })
})
