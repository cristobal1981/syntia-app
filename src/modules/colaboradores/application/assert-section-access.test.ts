import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'

const { redirect, getAllowedSectionsForWorker } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  getAllowedSectionsForWorker: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))

function sessionWithRole(role: string): PortalSession {
  return {
    user: { id: 'u1', email: 'u@example.com', name: 'U', role },
  } as unknown as PortalSession
}

beforeEach(() => {
  vi.resetAllMocks()
  redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  })
})

describe('assertSectionAccess', () => {
  it('lets the titular (client) through without consulting grants', async () => {
    await expect(assertSectionAccess(sessionWithRole('client'), '/tramites')).resolves.toBeUndefined()
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('lets a worker through when the section is granted', async () => {
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    await expect(assertSectionAccess(sessionWithRole('worker'), '/tramites')).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects a worker to /dashboard when the section is not granted', async () => {
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    await expect(assertSectionAccess(sessionWithRole('worker'), '/tramites')).rejects.toThrow(
      'REDIRECT:/dashboard'
    )
  })

  it('redirects a worker whose access is revoked (empty set)', async () => {
    getAllowedSectionsForWorker.mockResolvedValue(new Set())

    await expect(assertSectionAccess(sessionWithRole('worker'), '/guias')).rejects.toThrow(
      'REDIRECT:/dashboard'
    )
  })

  it.each(['admin', 'advisor'])('redirects %s without consulting worker grants', async (role) => {
    await expect(assertSectionAccess(sessionWithRole(role), '/tramites')).rejects.toThrow(
      'REDIRECT:/dashboard'
    )
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })
})
