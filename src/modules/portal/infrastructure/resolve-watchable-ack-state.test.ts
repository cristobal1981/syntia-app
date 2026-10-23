import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCachedTramitesSnapshot, getCachedObligacionNotificationSnapshot } = vi.hoisted(() => ({
  getCachedTramitesSnapshot: vi.fn(),
  getCachedObligacionNotificationSnapshot: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedTramitesSnapshot,
  getCachedObligacionNotificationSnapshot,
}))

import { resolveWatchableAckStateFromSnapshots } from '@/src/modules/portal/infrastructure/resolve-watchable-ack-state'

const base = {
  attachmentCount: 3,
  isClosed: false,
  modifiedAt: '2026-10-22T12:00:00.000Z',
  createdAt: '',
  priority: 0 as const,
  assignedNotifyPartnerIds: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  getCachedTramitesSnapshot.mockResolvedValue({
    tasks: [
      {
        ...base,
        id: 7,
        name: 'Alta',
        state: '01_in_progress',
        assignees: [
          { userId: 9, name: 'Luis' },
          { userId: 3, name: 'Ana' },
        ],
      },
    ],
    tickets: [{ ...base, id: 7, name: 'Duda', assignees: [{ userId: 5, name: 'Eva' }] }],
    tagFilterActive: true,
  })
})

describe('resolveWatchableAckStateFromSnapshots', () => {
  it('un trámite devuelve su estado actual y la huella de quién lo lleva', async () => {
    expect(await resolveWatchableAckStateFromSnapshots('tramite', 7, 1233)).toEqual({
      lastState: '01_in_progress',
      lastIsClosed: false,
      lastAttachmentCount: 3,
      lastAssigneeKey: '3,9',
    })
  })

  it('una consulta con el mismo id que un trámite no se confunde con él', async () => {
    expect(await resolveWatchableAckStateFromSnapshots('consulta', 7, 1233)).toMatchObject({
      lastState: 'open',
      lastAssigneeKey: '5',
    })
  })

  it('una obligación no tiene huella de responsables', async () => {
    getCachedObligacionNotificationSnapshot.mockResolvedValue({
      leaves: [{ id: 11, state: '01_in_progress', attachmentCount: 0 }],
    })
    const result = await resolveWatchableAckStateFromSnapshots('obligacion', 11, 1233)
    expect(result).toMatchObject({ lastState: '01_in_progress' })
    expect(result?.lastAssigneeKey).toBeUndefined()
  })

  it('si el registro ya no está en el snapshot, null; y una firma no se resuelve aquí', async () => {
    expect(await resolveWatchableAckStateFromSnapshots('tramite', 999, 1233)).toBeNull()
    expect(await resolveWatchableAckStateFromSnapshots('firma', 1, 1233)).toBeNull()
  })
})
