import { DOCUMENT_PREVIEW_MAX_BYTES } from '@/src/modules/portal/domain/classify-document-preview'

const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const DEFAULT_MAX_FILES_PER_BATCH = 10

export function getDriveMaxUploadBytes(): number {
  const raw = process.env.DRIVE_MAX_UPLOAD_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES
}

export function getDriveMaxFilesPerBatch(): number {
  const raw = process.env.DRIVE_MAX_FILES_PER_BATCH?.trim()
  if (!raw) return DEFAULT_MAX_FILES_PER_BATCH
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILES_PER_BATCH
}

export function getDrivePreviewMaxBytes(): number {
  return DOCUMENT_PREVIEW_MAX_BYTES
}

const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/

export function validateDriveItemName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 255 && !INVALID_NAME_PATTERN.test(trimmed)
}
