import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'

const { getWorkerGrant, getWorkerSettings, resolveDirectoryActorId } = vi.hoisted(() => ({
  getWorkerGrant: vi.fn(),
  getWorkerSettings: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
}))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  getWorkerGrant,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-settings.supabase', () => ({
  getWorkerSettings,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))

const worker: PortalUser = {
  id: 'auth-worker-1',
  email: 'worker@example.com',
  name: 'Worker One',
  role: 'worker',
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveDirectoryActorId.mockResolvedValue('portal-worker-1')
})

describe('getWorkerAccessStatus', () => {
  it('is inactive with no sections when there is no grant at all', async () => {
    getWorkerGrant.mockResolvedValue(null)

    const status = await getWorkerAccessStatus(worker)

    expect(status.active).toBe(false)
    expect(status.allowedSections.size).toBe(0)
    expect(getWorkerSettings).not.toHaveBeenCalled()
  })

  it('is inactive when the grant itself is disabled, even if the titular toggle is on', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: ['/tramites', '/documentos'],
      is_enabled: false,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })

    const status = await getWorkerAccessStatus(worker)

    expect(status.active).toBe(false)
    expect(status.allowedSections.size).toBe(0)
    expect(getWorkerSettings).not.toHaveBeenCalled()
  })

  it('is inactive when the grant is enabled but the titular has switched the feature off', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: ['/tramites', '/documentos'],
      is_enabled: true,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: false, max_workers: 5 })

    const status = await getWorkerAccessStatus(worker)

    expect(status.active).toBe(false)
    expect(status.allowedSections.size).toBe(0)
  })

  it('is active with the exact granted sections when both the grant and the titular toggle are on', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: ['/tramites', '/obligaciones'],
      is_enabled: true,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })

    const status = await getWorkerAccessStatus(worker)

    expect(status.active).toBe(true)
    expect([...status.allowedSections].sort()).toEqual(['/obligaciones', '/tramites'])
  })

  it('reports zero allowed sections (not "all sections") when the grant is active but has none checked', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: [],
      is_enabled: true,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })

    const status = await getWorkerAccessStatus(worker)

    expect(status.active).toBe(true)
    expect(status.allowedSections.size).toBe(0)
  })

  it('looks up the titular settings by the grant owner, not the worker itself', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-xyz',
      allowed_sections: ['/tramites'],
      is_enabled: true,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })

    await getWorkerAccessStatus(worker)

    expect(getWorkerSettings).toHaveBeenCalledWith('owner-xyz')
  })
})
