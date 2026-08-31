'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import type { WorkerAccessLevel } from '@/src/modules/colaboradores/domain/types'
import { resolveClientDriveRootId } from '@/src/modules/documents/application/resolve-client-drive-root'
import {
  createMockDriveFolder,
  deleteMockDriveItem,
  getMockDriveFileBinary,
  getMockDriveRootId,
  listMockDriveFolder,
  moveMockDriveItem,
  renameMockDriveItem,
  uploadMockDriveFiles,
} from '@/src/modules/documents/domain/mock-drive-items'
import { shouldUseMockDrive } from '@/src/modules/documents/infrastructure/drive-runtime'
import type {
  DriveDeleteResult,
  DriveDocumentErrorCode,
  DriveFileDownloadResult,
  DriveFolderListResult,
  DriveItemMutationResult,
  DriveUploadResult,
} from '@/src/modules/documents/domain/types'
import {
  getDriveMaxFilesPerBatch,
  getDriveMaxUploadBytes,
  getDrivePreviewMaxBytes,
  validateDriveItemName,
} from '@/src/modules/documents/infrastructure/drive-env'
import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'
import {
  createDriveFolder,
  deleteDriveItem,
  downloadDriveFile,
  listDriveFolder,
  moveDriveItem,
  renameDriveItem,
  uploadDriveFile,
} from '@/src/modules/documents/infrastructure/google-drive-repository'

async function resolveClientDriveAccess(
  requiredLevel: WorkerAccessLevel = 'read'
): Promise<
  | { ok: true; rootId: string }
  | { ok: false; error: DriveDocumentErrorCode }
> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
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

  const rootId = await resolveClientDriveRootId(session.user)
  if (!rootId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isGoogleDriveApiConfigured()) {
    return { ok: false, error: 'drive_unavailable' }
  }

  return { ok: true, rootId }
}

function resolveDriveError(error: unknown): DriveDocumentErrorCode {
  if (!(error instanceof Error)) {
    return 'drive_unavailable'
  }

  switch (error.message) {
    case 'DRIVE_ACCESS_FORBIDDEN':
      return 'forbidden'
    case 'DRIVE_ITEM_NOT_FOUND':
      return 'not_found'
    case 'DRIVE_NAME_CONFLICT':
      return 'name_conflict'
    case 'GOOGLE_DRIVE_NOT_CONFIGURED':
      return 'drive_unavailable'
    default:
      return 'drive_unavailable'
  }
}

export async function listDriveFolderAction(input?: {
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
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function getDriveFilePreviewAction(input: {
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
    const binary = await downloadDriveFile(fileId, access.rootId)
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
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function downloadDriveFileAction(input: {
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
    const binary = await downloadDriveFile(fileId, access.rootId)
    return {
      ok: true,
      filename: binary.filename,
      mimetype: binary.mimetype,
      dataBase64: binary.dataBase64,
    }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function getDriveDocumentsModeAction(): Promise<{ demo: boolean }> {
  return { demo: shouldUseMockDrive() }
}

export async function uploadDriveFilesAction(
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

  if (shouldUseMockDrive()) {
    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File)
    if (!files.length) {
      return { ok: false, error: 'upload_failed' }
    }

    const maxFiles = getDriveMaxFilesPerBatch()
    if (files.length > maxFiles) {
      return { ok: false, error: 'upload_failed' }
    }

    const maxBytes = getDriveMaxUploadBytes()
    for (const file of files) {
      if (file.size > maxBytes) {
        return { ok: false, error: 'too_large' }
      }
      if (!validateDriveItemName(file.name)) {
        return { ok: false, error: 'invalid_name' }
      }
    }

    try {
      const uploaded = uploadMockDriveFiles(
        parentFolderId,
        files.map((file) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        }))
      )
      return { ok: true, uploaded }
    } catch (error) {
      return { ok: false, error: resolveDriveError(error) }
    }
  }

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File)
  if (!files.length) {
    return { ok: false, error: 'upload_failed' }
  }

  const maxFiles = getDriveMaxFilesPerBatch()
  if (files.length > maxFiles) {
    return { ok: false, error: 'upload_failed' }
  }

  const maxBytes = getDriveMaxUploadBytes()
  for (const file of files) {
    if (file.size > maxBytes) {
      return { ok: false, error: 'too_large' }
    }
    if (!validateDriveItemName(file.name)) {
      return { ok: false, error: 'invalid_name' }
    }
  }

  try {
    const uploaded = []
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const item = await uploadDriveFile(
        parentFolderId,
        {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          buffer,
        },
        access.rootId
      )
      uploaded.push(item)
    }

    return { ok: true, uploaded }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function renameDriveItemAction(input: {
  itemId: string
  newName: string
}): Promise<DriveItemMutationResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const itemId = input.itemId?.trim()
  const newName = input.newName?.trim()
  if (!itemId || !newName || !validateDriveItemName(newName)) {
    return { ok: false, error: 'invalid_name' }
  }

  if (shouldUseMockDrive()) {
    try {
      const item = renameMockDriveItem(itemId, newName)
      return { ok: true, item }
    } catch (error) {
      return { ok: false, error: resolveDriveError(error) }
    }
  }

  try {
    const item = await renameDriveItem(itemId, newName, access.rootId)
    return { ok: true, item }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function deleteDriveItemAction(input: {
  itemId: string
}): Promise<DriveDeleteResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const itemId = input.itemId?.trim()
  if (!itemId) {
    return { ok: false, error: 'not_found' }
  }

  if (itemId === access.rootId) {
    return { ok: false, error: 'forbidden' }
  }

  if (shouldUseMockDrive()) {
    try {
      deleteMockDriveItem(itemId)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: resolveDriveError(error) }
    }
  }

  try {
    await deleteDriveItem(itemId, access.rootId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function createDriveFolderAction(input: {
  parentFolderId: string
  name: string
}): Promise<DriveItemMutationResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const parentFolderId = input.parentFolderId?.trim()
  const name = input.name?.trim()
  if (!parentFolderId || !name || !validateDriveItemName(name)) {
    return { ok: false, error: 'invalid_name' }
  }

  if (shouldUseMockDrive()) {
    try {
      const item = createMockDriveFolder(parentFolderId, name)
      return { ok: true, item }
    } catch (error) {
      return { ok: false, error: resolveDriveError(error) }
    }
  }

  try {
    const item = await createDriveFolder(parentFolderId, name, access.rootId)
    return { ok: true, item }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}

export async function moveDriveItemAction(input: {
  itemId: string
  targetFolderId: string
  sourceFolderId: string
}): Promise<DriveItemMutationResult> {
  const access = await resolveClientDriveAccess('write')
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const itemId = input.itemId?.trim()
  const targetFolderId = input.targetFolderId?.trim()
  const sourceFolderId = input.sourceFolderId?.trim()
  if (!itemId || !targetFolderId || !sourceFolderId) {
    return { ok: false, error: 'not_found' }
  }

  if (itemId === access.rootId) {
    return { ok: false, error: 'forbidden' }
  }

  if (shouldUseMockDrive()) {
    try {
      const item = moveMockDriveItem(itemId, targetFolderId, sourceFolderId)
      return { ok: true, item }
    } catch (error) {
      return { ok: false, error: resolveDriveError(error) }
    }
  }

  try {
    const item = await moveDriveItem(itemId, targetFolderId, sourceFolderId, access.rootId)
    return { ok: true, item }
  } catch (error) {
    return { ok: false, error: resolveDriveError(error) }
  }
}
