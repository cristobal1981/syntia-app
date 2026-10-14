import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'

const { getWorkerAccessStatus } = vi.hoisted(() => ({ getWorkerAccessStatus: vi.fn() }))

vi.mock('@/src/modules/colaboradores/application/get-worker-access-status', () => ({
  getWorkerAccessStatus,
}))

const worker: PortalUser = { id: 'w', email: 'w@example.com', name: 'W', role: 'worker' }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getAllowedSectionsForWorker', () => {
  it('returns allowedSections (read OR write), not writeSections', async () => {
    getWorkerAccessStatus.mockResolvedValue({
      active: true,
      allowedSections: new Set(['/tramites', '/guias']),
      writeSections: new Set(['/tramites']),
    })

    const result = await getAllowedSectionsForWorker(worker)

    expect([...result].sort()).toEqual(['/guias', '/tramites'])
    expect(getWorkerAccessStatus).toHaveBeenCalledWith(worker)
  })
})
