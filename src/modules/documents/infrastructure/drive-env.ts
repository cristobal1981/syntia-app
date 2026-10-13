import { DOCUMENT_PREVIEW_MAX_BYTES } from '@/src/modules/portal/domain/classify-document-preview'
import { isValidUploadFileName } from '@/src/modules/portal/domain/upload-policy'

// Todo el archivo se carga en memoria al descargar (y en base64 ocupa ~1,33x).
// Los límites de subida ya no se configuran aquí: ver `upload-policy.ts`.
const DEFAULT_MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024

export function getDriveMaxDownloadBytes(): number {
  const raw = process.env.DRIVE_MAX_DOWNLOAD_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_DOWNLOAD_BYTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DOWNLOAD_BYTES
}

export function getDrivePreviewMaxBytes(): number {
  return DOCUMENT_PREVIEW_MAX_BYTES
}

export function validateDriveItemName(name: string): boolean {
  return isValidUploadFileName(name)
}
