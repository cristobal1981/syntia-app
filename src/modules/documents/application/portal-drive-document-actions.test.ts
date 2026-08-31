import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  createDriveFolderAction,
  listDriveFolderAction,
} from '@/src/modules/documents/application/portal-drive-document-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  getWorkerWriteSections,
  resolveClientDriveRootId,
  shouldUseMockDrive,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientDriveRootId: vi.fn(),
  shouldUseMockDrive: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections,
}))
vi.mock('@/src/modules/documents/application/resolve-client-drive-root', () => ({
  resolveClientDriveRootId,
}))
vi.mock('@/src/modules/documents/infrastructure/drive-runtime', () => ({ shouldUseMockDrive }))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  shouldUseMockDrive.mockReturnValue(true)
})

describe('portal-drive-document-actions ("Documentos" section gate)', () => {
  it('refuses a worker without /documentos granted, without ever touching the drive layer', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await listDriveFolderAction()

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: 'forbidden' })
  })

  it('lets a worker with /documentos granted through', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await listDriveFolderAction()

    expect(result.ok).toBe(true)
  })

  it('never section-checks a full client (the check is worker-only by design)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await listDriveFolderAction()

    expect(result.ok).toBe(true)
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('rejects with no session at all, before any section check', async () => {
    getSession.mockResolvedValue(null)

    const result = await listDriveFolderAction()

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: 'forbidden' })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })
})

describe('portal-drive-document-actions ("Documentos" write gate for colaboradores)', () => {
  it('refuses a worker with only "read" on /documentos — cannot create a folder', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set())

    const result = await createDriveFolderAction({
      parentFolderId: 'mock-root',
      name: 'Carpeta bloqueada',
    })

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: 'forbidden' })
  })

  it('lets a worker with /documentos granted at "write" level create a folder', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))

    const result = await createDriveFolderAction({
      parentFolderId: 'mock-root',
      name: 'Carpeta permitida',
    })

    expect(result.ok).toBe(true)
  })

  it('never write-section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createDriveFolderAction({
      parentFolderId: 'mock-root',
      name: 'Carpeta cliente',
    })

    expect(result.ok).toBe(true)
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})
