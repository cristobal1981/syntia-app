import {
  findUploadPolicyViolation,
  type UploadCandidate,
  type UploadPolicyViolation,
} from '@/src/modules/portal/domain/upload-policy'
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'

export type ChatterAttachmentValidationError =
  | 'invalid_attachment'
  | 'attachment_too_large'
  | 'too_many_attachments'

const ERROR_BY_VIOLATION: Record<UploadPolicyViolation, ChatterAttachmentValidationError> = {
  empty: 'invalid_attachment',
  too_many_files: 'too_many_attachments',
  invalid_name: 'invalid_attachment',
  invalid_type: 'invalid_attachment',
  file_too_large: 'attachment_too_large',
  total_too_large: 'attachment_too_large',
}

/** Misma política que Documentos: ver `upload-policy.ts`. */
export function validateChatterCandidates(
  candidates: readonly UploadCandidate[]
): { ok: true } | { ok: false; error: ChatterAttachmentValidationError } {
  const violation = findUploadPolicyViolation(candidates)
  return violation ? { ok: false, error: ERROR_BY_VIOLATION[violation] } : { ok: true }
}

export function validateChatterUploadFiles(
  files: PortalChatterUploadFile[]
): { ok: true } | { ok: false; error: ChatterAttachmentValidationError } {
  return validateChatterCandidates(
    files.map((file) => ({
      name: file.name,
      mimeType: file.mimetype,
      size: Buffer.byteLength(file.dataBase64, 'base64'),
    }))
  )
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
