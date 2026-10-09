'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
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
  getDriveMaxFilesPerBatch,
  getDriveMaxUploadBytes,
  getDrivePreviewMaxBytes,
  isDangerousDriveUpload,
  validateDriveItemName,
} from '@/src/modules/documents/infrastructure/drive-env'
import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'
import {
  downloadDriveFile,
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
  const session = await getSession()
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

function validateUploadBatch(files: File[]): DriveDocumentErrorCode | null {
  if (!files.length) return 'upload_failed'
  if (files.length > getDriveMaxFilesPerBatch()) return 'upload_failed'

  const maxBytes = getDriveMaxUploadBytes()
  for (const file of files) {
    if (file.size > maxBytes) return 'too_large'
    if (!validateDriveItemName(file.name)) return 'invalid_name'
    if (isDangerousDriveUpload(file.name, file.type)) return 'invalid_type'
  }
  return null
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

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File)
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
    const duplicate = await findDuplicateInSubtree(parentFolderId, names, access.rootId)
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
        access.rootId
      )
      uploaded.push(item)
    }

    return { ok: true, uploaded }
  } catch (error) {
    logDriveFailure('upload', error)
    return { ok: false, error: mapDriveErrorToCode(error) }
  }
}
