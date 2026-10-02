import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  createDriveFolderAction,
  listDriveFolderAction,
  uploadDriveFilesAction,
} from '@/src/modules/documents/application/portal-drive-document-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  getWorkerWriteSections,
  resolveClientDriveRootId,
  shouldUseMockDrive,
  uploadDriveFile,
  isGoogleDriveApiConfigured,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientDriveRootId: vi.fn(),
  shouldUseMockDrive: vi.fn(),
  uploadDriveFile: vi.fn(),
  isGoogleDriveApiConfigured: vi.fn(),
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
vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  isGoogleDriveApiConfigured,
}))
vi.mock('@/src/modules/documents/infrastructure/google-drive-repository', () => ({
  createDriveFolder: vi.fn(),
  deleteDriveItem: vi.fn(),
  downloadDriveFile: vi.fn(),
  listDriveFolder: vi.fn(),
  moveDriveItem: vi.fn(),
  renameDriveItem: vi.fn(),
  uploadDriveFile,
}))

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

function formDataWithFile(file: File, parentFolderId = 'mock-root'): FormData {
  const formData = new FormData()
  formData.set('parentFolderId', parentFolderId)
  formData.append('files', file)
  return formData
}

describe('uploadDriveFilesAction (dangerous file type gate)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('uploads a normal document fine', async () => {
    const file = new File(['%PDF-1.4'], 'factura.pdf', { type: 'application/pdf' })

    const result = await uploadDriveFilesAction(formDataWithFile(file))

    expect(result.ok).toBe(true)
  })

  it('rejects an executable by extension, before ever calling the drive layer', async () => {
    const file = new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' })

    const result = await uploadDriveFilesAction(formDataWithFile(file))

    expect(result).toMatchObject({ ok: false, error: 'invalid_type' })
  })

  it('rejects a dangerous mimetype even with a disguised extension', async () => {
    const file = new File(['MZ'], 'factura.pdf', { type: 'application/x-msdownload' })

    const result = await uploadDriveFilesAction(formDataWithFile(file))

    expect(result).toMatchObject({ ok: false, error: 'invalid_type' })
  })

  describe('real Drive path (shouldUseMockDrive: false)', () => {
    beforeEach(() => {
      shouldUseMockDrive.mockReturnValue(false)
      resolveClientDriveRootId.mockResolvedValue('root-1')
      isGoogleDriveApiConfigured.mockReturnValue(true)
      uploadDriveFile.mockResolvedValue({ id: 'item-1', name: 'factura.pdf' })
    })

    it('uploads a normal document through the real Drive API', async () => {
      const file = new File(['%PDF-1.4'], 'factura.pdf', { type: 'application/pdf' })

      const result = await uploadDriveFilesAction(formDataWithFile(file))

      expect(result.ok).toBe(true)
      expect(uploadDriveFile).toHaveBeenCalledTimes(1)
    })

    it('rejects an executable before ever calling the real Drive API', async () => {
      const file = new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' })

      const result = await uploadDriveFilesAction(formDataWithFile(file))

      expect(result).toMatchObject({ ok: false, error: 'invalid_type' })
      expect(uploadDriveFile).not.toHaveBeenCalled()
    })
  })
})
