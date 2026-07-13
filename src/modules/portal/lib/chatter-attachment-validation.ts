import {
  getChatterMaxAttachmentBytes,
  getChatterMaxAttachmentsPerMessage,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'

const ALLOWED_MIME_PREFIXES = ['image/'] as const

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
])

export type ChatterAttachmentValidationError =
  | 'invalid_attachment'
  | 'attachment_too_large'
  | 'too_many_attachments'

export function isAllowedChatterMimeType(mimetype: string): boolean {
  const normalized = mimetype.trim().toLowerCase()
  if (!normalized) return false
  if (ALLOWED_MIME_TYPES.has(normalized)) return true
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function validateChatterUploadFiles(
  files: PortalChatterUploadFile[]
): { ok: true } | { ok: false; error: ChatterAttachmentValidationError } {
  const maxCount = getChatterMaxAttachmentsPerMessage()
  const maxBytes = getChatterMaxAttachmentBytes()

  if (files.length > maxCount) {
    return { ok: false, error: 'too_many_attachments' }
  }

  for (const file of files) {
    if (!isAllowedChatterMimeType(file.mimetype)) {
      return { ok: false, error: 'invalid_attachment' }
    }

    const byteLength = Buffer.byteLength(file.dataBase64, 'base64')
    if (byteLength > maxBytes) {
      return { ok: false, error: 'attachment_too_large' }
    }
  }

  return { ok: true }
}

export async function readFilesAsUploadPayload(
  files: File[]
): Promise<PortalChatterUploadFile[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<PortalChatterUploadFile>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result
            if (typeof result !== 'string') {
              reject(new Error('FILE_READ_FAILED'))
              return
            }
            const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result
            resolve({
              name: file.name,
              mimetype: file.type || 'application/octet-stream',
              dataBase64: base64,
            })
          }
          reader.onerror = () => reject(reader.error ?? new Error('FILE_READ_FAILED'))
          reader.readAsDataURL(file)
        })
    )
  )
}

export function validatePendingFilesSelection(
  currentCount: number,
  incomingCount: number
): { ok: true } | { ok: false; error: ChatterAttachmentValidationError } {
  const maxCount = getChatterMaxAttachmentsPerMessage()
  if (currentCount + incomingCount > maxCount) {
    return { ok: false, error: 'too_many_attachments' }
  }
  return { ok: true }
}
