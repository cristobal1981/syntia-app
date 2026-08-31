import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'

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
  getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })
})

describe('getWorkerWriteSections', () => {
  it('only includes sections granted at the "write" level, not "read"', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: { '/tramites': 'write', '/documentos': 'read' },
      is_enabled: true,
    })

    const writeSections = await getWorkerWriteSections(worker)

    expect([...writeSections]).toEqual(['/tramites'])
  })

  it('is empty when the grant is disabled, even if sections are marked "write"', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: { '/tramites': 'write' },
      is_enabled: false,
    })

    const writeSections = await getWorkerWriteSections(worker)

    expect(writeSections.size).toBe(0)
  })

  it('is empty when the titular has switched the colaboradores feature off', async () => {
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'portal-worker-1',
      owner_user_id: 'owner-1',
      allowed_sections: { '/tramites': 'write' },
      is_enabled: true,
    })
    getWorkerSettings.mockResolvedValue({ workers_enabled: false, max_workers: 5 })

    const writeSections = await getWorkerWriteSections(worker)

    expect(writeSections.size).toBe(0)
  })
})
