'use server'

import { getDocumentsSession } from '@/src/modules/documents/application/get-documents-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import type { WorkerAccessLevel } from '@/src/modules/colaboradores/domain/types'
import { resolveClientDriveRootId } from '@/src/modules/documents/application/resolve-client-drive-root'
import {
  getMockDriveFileBinary,
  findMockDriveDuplicate,
  getMockDriveRootId,
  listMockDriveFolder,
  uploadMockDriveFiles,
} from '@/src/modules/documents/domain/mock-drive-items'
import {
  guardDriveAction,
  logDriveFailure,
  mapDriveErrorToCode,
} from '@/src/modules/documents/application/drive-error-mapping'
import { shouldUseMockDrive } from '@/src/modules/documents/infrastructure/drive-runtime'
import type {
  DriveDocumentErrorCode,
  DriveFileDownloadResult,
  DriveFolderListResult,
  DriveUploadResult,
} from '@/src/modules/documents/domain/types'
import {
  getDriveMaxDownloadBytes,
  getDrivePreviewMaxBytes,
} from '@/src/modules/documents/infrastructure/drive-env'
import {
  currentYearInMadrid,
  INVOICE_YEAR_FOLDER_NAME,
  invoiceFolderName,
} from '@/src/modules/documents/domain/invoice-upload-target'
import {
  findUploadPolicyViolation,
  type UploadPolicyViolation,
} from '@/src/modules/portal/domain/upload-policy'
import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'
import {
  downloadDriveFile,
  findChildFolderIdByName,
  findDuplicateInSubtree,
  listDriveFolder,
  uploadDriveFile,
} from '@/src/modules/documents/infrastructure/google-drive-repository'

async function resolveClientDriveAccess(
  requiredLevel: WorkerAccessLevel = 'read'
): Promise<
  | { ok: true; rootId: string }
  | { ok: false; error: DriveDocumentErrorCode }
> {
  const session = await getDocumentsSession()
  if (!session) {
    return { ok: false, error: 'session_expired' }
  }
  if (!isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  if (session.user.role === 'worker') {
    const sections =
      requiredLevel === 'write'
        ? await getWorkerWriteSections(session.user)
        : await getAllowedSectionsForWorker(session.user)
    if (!sections.has('/documentos')) {
      return { ok: false, error: 'forbidden' }
    }
  }

  if (shouldUseMockDrive()) {
    return { ok: true, rootId: getMockDriveRootId() }
  }

  // Sin credenciales de Google no hay Documentos (y en producción nunca hay demo).
  if (!isGoogleDriveApiConfigured()) {
    return { ok: false, error: 'not_configured' }
  }

  const rootId = (await resolveClientDriveRootId(session.user))?.trim()
  if (!rootId) {
    return { ok: false, error: 'not_linked' }
  }

  return { ok: true, rootId }
}

export async function listDriveFolderAction(input?: { folderId?: string }): Promise<DriveFolderListResult> {
  return guardDriveAction(
    'list',
    () => listDriveFolderActionImpl(input),
    (error) => ({ ok: false, error })
  )
}

async function listDriveFolderActionImpl(input?: {
  folderId?: string
}): Promise<DriveFolderListResult> {
  const access = await resolveClientDriveAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const folderId = input?.folderId?.trim() || access.rootId

  try {
    if (shouldUseMockDrive()) {
      return { ok: true, listing: listMockDriveFolder(folderId) }
    }

    const listing = await listDriveFolder(folderId, access.rootId)
    return { ok: true, listing }
  } catch (error) {
    logDriveFailure('list', error)
    return { ok: false, error: mapDriveErrorToCode(error) }
  }
}

export async function getDriveFilePreviewAction(input: { fileId: string }): Promise<DriveFileDownloadResult> {
  return guardDriveAction(
    'preview',
    () => getDriveFilePreviewActionImpl(input),
    (error) => ({ ok: false, error })
  )
}

async function getDriveFilePreviewActionImpl(input: {
  fileId: string
}): Promise<DriveFileDownloadResult> {
  const access = await resolveClientDriveAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const fileId = input.fileId?.trim()
  if (!fileId) {
    return { ok: false, error: 'not_found' }
  }

  if (shouldUseMockDrive()) {
    const mock = getMockDriveFileBinary(fileId)
    if (!mock) {
      return { ok: false, error: 'not_found' }
    }
    const size = Buffer.from(mock.dataBase64, 'base64').length
    if (size > getDrivePreviewMaxBytes()) {
      return { ok: false, error: 'too_large' }
    }
    return {
      ok: true,
      filename: mock.filename,
      mimetype: mock.mimetype,
      dataBase64: mock.dataBase64,
    }
  }

  try {
    const binary = await downloadDriveFile(fileId, access.rootId, {
      maxBytes: Math.min(getDrivePreviewMaxBytes(), getDriveMaxDownloadBytes()),
    })
    if (binary.size > getDrivePreviewMaxBytes()) {
      return { ok: false, error: 'too_large' }
    }

    return {
      ok: true,
      filename: binary.filename,
      mimetype: binary.mimetype,
      dataBase64: binary.dataBase64,
    }
  } catch (error) {
    logDriveFailure('preview', error)
    return { ok: false, error: mapDriveErrorToCode(error) }
  }
}

export async function downloadDriveFileAction(input: { fileId: string }): Promise<DriveFileDownloadResult> {
  return guardDriveAction(
    'download',
    () => downloadDriveFileActionImpl(input),
    (error) => ({ ok: false, error })
  )
}

async function downloadDriveFileActionImpl(input: {
  fileId: string
}): Promise<DriveFileDownloadResult> {
  const access = await resolveClientDriveAccess()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const fileId = input.fileId?.trim()
  if (!fileId) {
    return { ok: false, error: 'not_found' }
  }

  if (shouldUseMockDrive()) {
    const mock = getMockDriveFileBinary(fileId)
    if (!mock) {
      return { ok: false, error: 'not_found' }
    }
    return {
      ok: true,
      filename: mock.filename,
      mimetype: mock.mimetype,
      dataBase64: mock.dataBase64,
    }
  }

  try {
    const binary = await downloadDriveFile(fileId, access.rootId, {
      maxBytes: getDriveMaxDownloadBytes(),
    })
    return {
      ok: true,
      filename: binary.filename,
      mimetype: binary.mimetype,
      dataBase64: binary.dataBase64,
    }
  } catch (error) {
    logDriveFailure('download', error)
    return { ok: false, error: mapDriveErrorToCode(error) }
  }
}

export async function getDriveDocumentsModeAction(): Promise<{ demo: boolean }> {
  return { demo: shouldUseMockDrive() }
}

const DRIVE_CODE_BY_VIOLATION: Record<UploadPolicyViolation, DriveDocumentErrorCode> = {
  empty: 'upload_failed',
  too_many_files: 'upload_failed',
  invalid_name: 'invalid_name',
  invalid_type: 'invalid_type',
  file_too_large: 'too_large',
  total_too_large: 'too_large',
}

function validateUploadBatch(files: File[]): DriveDocumentErrorCode | null {
  const violation = findUploadPolicyViolation(
    files.map((file) => ({ name: file.name, mimeType: file.type, size: file.size }))
  )
  return violation ? DRIVE_CODE_BY_VIOLATION[violation] : null
}

export async function uploadDriveFilesAction(formData: FormData): Promise<DriveUploadResult> {
  return guardDriveAction(
    'upload',
    () => uploadDriveFilesActionImpl(formData),
    (error) => ({ ok: false, error })
  )
}

async function uploadDriveFilesActionImpl(
  formData: FormData
): Promise<DriveUploadResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const parentFolderId = String(formData.get('parentFolderId') ?? '').trim()
  if (!parentFolderId) {
    return { ok: false, error: 'not_found' }
  }

  return uploadFilesIntoFolder(
    access.rootId,
    parentFolderId,
    formData.getAll('files').filter((entry): entry is File => entry instanceof File)
  )
}

/** Validación, duplicados y subida: el único camino por el que se escribe en Drive. */
async function uploadFilesIntoFolder(
  rootId: string,
  parentFolderId: string,
  files: File[]
): Promise<DriveUploadResult> {
  // Todo el lote se valida antes de subir nada: un archivo malo no deja subidas a medias.
  const invalid = validateUploadBatch(files)
  if (invalid) {
    return { ok: false, error: invalid }
  }

  const names = files.map((file) => file.name.trim())

  try {
    if (shouldUseMockDrive()) {
      const duplicate = findMockDriveDuplicate(parentFolderId, names)
      if (duplicate) return { ok: false, error: 'duplicate', duplicate }

      const uploaded = uploadMockDriveFiles(
        parentFolderId,
        files.map((file, index) => ({
          name: names[index],
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        }))
      )
      return { ok: true, uploaded }
    }

    // Mismo nombre en la carpeta de destino o en cualquiera de sus subcarpetas.
    const duplicate = await findDuplicateInSubtree(parentFolderId, names, rootId)
    if (duplicate) return { ok: false, error: 'duplicate', duplicate }

    const uploaded = []
    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const item = await uploadDriveFile(
        parentFolderId,
        {
          name: names[index],
          mimeType: file.type || 'application/octet-stream',
          buffer,
        },
        rootId
      )
      uploaded.push(item)
    }

    return { ok: true, uploaded }
  } catch (error) {
    logDriveFailure('upload', error)
    return { ok: false, error: mapDriveErrorToCode(error) }
  }
}

// ---------------------------------------------------------------------------
// Subida rápida de facturas de compra
// ---------------------------------------------------------------------------

type InvoiceTarget = { folderId: string; folderName: string }

const INVOICE_TARGET_TTL_MS = 60_000
const INVOICE_TARGET_CACHE_MAX = 2000
const invoiceTargetCache = new Map<
  string,
  { target: InvoiceTarget | null; expiresAt: number }
>()

/**
 * «Año en curso» > «Facturas de compras [año]» dentro de la Pública. El destino
 * lo decide siempre el servidor desde la raíz del cliente: el navegador no
 * manda ningún id de carpeta. Si falta alguna carpeta o es ambigua, no hay destino.
 */
async function resolveInvoiceTarget(rootId: string): Promise<InvoiceTarget | null> {
  const year = currentYearInMadrid()
  const key = `${rootId}|${year}`
  const cached = invoiceTargetCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.target

  const yearFolderId = await findChildFolderIdByName(rootId, rootId, INVOICE_YEAR_FOLDER_NAME)
  const folderName = invoiceFolderName(year)
  const invoiceFolderId = yearFolderId
    ? await findChildFolderIdByName(yearFolderId, rootId, folderName)
    : null
  const target = invoiceFolderId ? { folderId: invoiceFolderId, folderName } : null

  if (invoiceTargetCache.size >= INVOICE_TARGET_CACHE_MAX) invoiceTargetCache.clear()
  invoiceTargetCache.set(key, { target, expiresAt: Date.now() + INVOICE_TARGET_TTL_MS })
  return target
}

export type InvoiceUploadAvailability = { available: boolean; folderName?: string }

/** ¿Debe mostrarse el botón de factura rápida? Nunca falla: ante cualquier duda, no. */
export async function getInvoiceUploadAvailabilityAction(): Promise<InvoiceUploadAvailability> {
  try {
    const access = await resolveClientDriveAccess('write')
    if (!access.ok || shouldUseMockDrive()) return { available: false }

    const target = await resolveInvoiceTarget(access.rootId)
    return target ? { available: true, folderName: target.folderName } : { available: false }
  } catch (error) {
    logDriveFailure('invoice-availability', error)
    return { available: false }
  }
}

export async function uploadInvoiceFilesAction(formData: FormData): Promise<DriveUploadResult> {
  return guardDriveAction(
    'upload',
    () => uploadInvoiceFilesActionImpl(formData),
    (error) => ({ ok: false, error })
  )
}

async function uploadInvoiceFilesActionImpl(formData: FormData): Promise<DriveUploadResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }
  if (shouldUseMockDrive()) {
    return { ok: false, error: 'not_found' }
  }

  const target = await resolveInvoiceTarget(access.rootId)
  if (!target) {
    return { ok: false, error: 'not_found' }
  }

  // Cualquier `parentFolderId` que mande el navegador se ignora a propósito.
  return uploadFilesIntoFolder(
    access.rootId,
    target.folderId,
    formData.getAll('files').filter((entry): entry is File => entry instanceof File)
  )
}
