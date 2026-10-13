import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { acknowledgeTramiteListItemSeenAction } from '@/src/modules/tramites/application/tramites-list-seen-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveDirectoryActorId,
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  fetchTramitesListSeenState: vi.fn(),
  upsertTramitesListSeenState: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase', () => ({
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
}))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: true })
})

describe('tramites-list-seen-actions (/tramites section gate)', () => {
  it('silently no-ops for a worker without /tramites granted, never writing seen-state', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/obligaciones']))

    await acknowledgeTramiteListItemSeenAction('task:1')

    expect(upsertTramitesListSeenState).not.toHaveBeenCalled()
  })

  it('writes seen-state for a worker who does have /tramites', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    await acknowledgeTramiteListItemSeenAction('task:1')

    expect(upsertTramitesListSeenState).toHaveBeenCalledWith('actor-1', ['task:1'])
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    await acknowledgeTramiteListItemSeenAction('task:2')

    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
    expect(upsertTramitesListSeenState).toHaveBeenCalledWith('actor-1', ['task:2'])
  })

  it('no-ops with no session', async () => {
    getSession.mockResolvedValue(null)

    await acknowledgeTramiteListItemSeenAction('task:3')

    expect(upsertTramitesListSeenState).not.toHaveBeenCalled()
  })
})
