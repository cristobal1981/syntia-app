import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  getWorkersFeatureForClient,
  setWorkersFeatureForClient,
} from '@/src/modules/colaboradores/application/workers-feature-toggle'

const { getWorkerSettings, setWorkersEnabled, resolveDirectoryActorId } = vi.hoisted(() => ({
  getWorkerSettings: vi.fn(),
  setWorkersEnabled: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
}))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-settings.supabase', () => ({
  getWorkerSettings,
  setWorkersEnabled,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))

const clientA: PortalUser = { id: 'auth-a', email: 'a@example.com', name: 'A', role: 'client' }
const worker: PortalUser = { id: 'auth-w', email: 'w@example.com', name: 'W', role: 'worker' }

beforeEach(() => {
  vi.clearAllMocks()
  resolveDirectoryActorId.mockResolvedValue('portal-client-a')
})

describe('getWorkersFeatureForClient', () => {
  it('refuses a worker (or any non-client) with disabled/zero defaults, without touching the DB', async () => {
    const result = await getWorkersFeatureForClient(worker)

    expect(result).toEqual({ workers_enabled: false, max_workers: 0 })
    expect(getWorkerSettings).not.toHaveBeenCalled()
  })

  it('looks up settings keyed by the actor\'s OWN resolved id, never a caller-supplied one', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })

    await getWorkersFeatureForClient(clientA)

    expect(getWorkerSettings).toHaveBeenCalledWith('portal-client-a')
  })
})

describe('setWorkersFeatureForClient (toggling the feature)', () => {
  it('ATTACK: a worker cannot toggle their own titular\'s feature flag', async () => {
    const result = await setWorkersFeatureForClient(worker, true)

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(setWorkersEnabled).not.toHaveBeenCalled()
  })

  it('a client can only ever toggle their OWN settings row (id comes from resolveDirectoryActorId, not from input)', async () => {
    await setWorkersFeatureForClient(clientA, false)

    expect(setWorkersEnabled).toHaveBeenCalledWith('portal-client-a', false)
  })
})
