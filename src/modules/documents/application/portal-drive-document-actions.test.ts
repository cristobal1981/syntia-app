import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import * as driveActions from '@/src/modules/documents/application/portal-drive-document-actions'
import {
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
  findDuplicateInSubtree,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientDriveRootId: vi.fn(),
  shouldUseMockDrive: vi.fn(),
  uploadDriveFile: vi.fn(),
  isGoogleDriveApiConfigured: vi.fn(),
  findDuplicateInSubtree: vi.fn(),
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
  downloadDriveFile: vi.fn(),
  findDuplicateInSubtree,
  listDriveFolder: vi.fn(),
  uploadDriveFile,
}))

// El estado del modo demo vive en el módulo: cada subida usa un nombre distinto.
let uploadSeq = 0

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
    expect(result).toMatchObject({ error: 'session_expired' })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })
})

describe('portal-drive-document-actions ("Documentos" write gate for colaboradores)', () => {
  const upload = () =>
    uploadDriveFilesAction(
      formDataWithFile(new File(['%PDF-1.4'], `prueba-${++uploadSeq}.pdf`, { type: 'application/pdf' }))
    )

  it('refuses a worker with only "read" on /documentos — cannot upload', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set())

    const result = await upload()

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: 'forbidden' })
  })

  it('lets a worker with /documentos granted at "write" level upload', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))

    const result = await upload()

    expect(result.ok).toBe(true)
  })

  it('never write-section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await upload()

    expect(result.ok).toBe(true)
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})

describe('portal-drive-document-actions (solo leer, descargar y subir)', () => {
  it('no expone acciones de renombrar, mover, eliminar ni crear carpetas', () => {
    expect(Object.keys(driveActions).sort()).toEqual(
      [
        'downloadDriveFileAction',
        'getDriveDocumentsModeAction',
        'getDriveFilePreviewAction',
        'listDriveFolderAction',
        'uploadDriveFilesAction',
      ].sort()
    )
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
    const file = new File(['%PDF-1.4'], `prueba-${++uploadSeq}.pdf`, { type: 'application/pdf' })

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
      findDuplicateInSubtree.mockResolvedValue(null)
      uploadDriveFile.mockResolvedValue({ id: 'item-1', name: 'factura.pdf' })
    })

    it('uploads a normal document through the real Drive API', async () => {
      const file = new File(['%PDF-1.4'], `prueba-${++uploadSeq}.pdf`, { type: 'application/pdf' })

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

describe('uploadDriveFilesAction (duplicados en modo demo)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('rechaza un nombre que ya existe en una subcarpeta del árbol demo y devuelve la ruta', async () => {
    const first = new File(['x'], 'unico-demo.pdf', { type: 'application/pdf' })
    expect(await uploadDriveFilesAction(formDataWithFile(first))).toMatchObject({ ok: true })

    const again = new File(['x'], 'UNICO-DEMO.pdf', { type: 'application/pdf' })
    const result = await uploadDriveFilesAction(formDataWithFile(again))

    expect(result).toMatchObject({
      ok: false,
      error: 'duplicate',
      duplicate: { name: 'unico-demo.pdf', folders: [] },
    })
  })
})

describe('real Drive path: duplicado detectado por el repositorio', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
    shouldUseMockDrive.mockReturnValue(false)
    resolveClientDriveRootId.mockResolvedValue('root-1')
    isGoogleDriveApiConfigured.mockReturnValue(true)
  })

  it('si hay duplicado devuelve la ruta y NO llama a subir', async () => {
    findDuplicateInSubtree.mockResolvedValue({ name: 'uno.jpg', folders: ['Facturas'] })
    const file = new File(['x'], 'uno.jpg', { type: 'image/jpeg' })

    const result = await uploadDriveFilesAction(formDataWithFile(file))

    expect(result).toEqual({
      ok: false,
      error: 'duplicate',
      duplicate: { name: 'uno.jpg', folders: ['Facturas'] },
    })
    expect(uploadDriveFile).not.toHaveBeenCalled()
  })

  it('pregunta con TODOS los nombres del lote, recortados, y con la raíz del cliente', async () => {
    findDuplicateInSubtree.mockResolvedValue(null)
    uploadDriveFile.mockResolvedValue({ id: 'i', name: 'a' })
    const form = new FormData()
    form.set('parentFolderId', 'carpeta-1')
    form.append('files', new File(['x'], ' a.pdf ', { type: 'application/pdf' }))
    form.append('files', new File(['x'], 'b.pdf', { type: 'application/pdf' }))

    await uploadDriveFilesAction(form)

    expect(findDuplicateInSubtree).toHaveBeenCalledWith('carpeta-1', ['a.pdf', 'b.pdf'], 'root-1')
  })
})
