import type { PortalAttachment } from '@/src/modules/portal/domain/portal-record-types'

export type DocumentPreviewCategory =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'unsupported'

export type DocumentPreviewClassification = {
  category: DocumentPreviewCategory
  canPreview: boolean
  reason?: 'too_large' | 'unsupported'
}

export const DOCUMENT_PREVIEW_MAX_BYTES = 15 * 1024 * 1024

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function extensionFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function classifyDocumentPreview(
  attachment: Pick<PortalAttachment, 'name' | 'mimetype' | 'fileSize'>
): DocumentPreviewClassification {
  if (
    typeof attachment.fileSize === 'number' &&
    attachment.fileSize > DOCUMENT_PREVIEW_MAX_BYTES
  ) {
    return { category: 'unsupported', canPreview: false, reason: 'too_large' }
  }

  const mimetype = attachment.mimetype?.toLowerCase() ?? ''
  const extension = extensionFromName(attachment.name)

  if (mimetype.startsWith('image/')) {
    return { category: 'image', canPreview: true }
  }

  if (mimetype === 'application/pdf' || extension === 'pdf') {
    return { category: 'pdf', canPreview: true }
  }

  if (mimetype === DOCX_MIME || extension === 'docx') {
    return { category: 'docx', canPreview: true }
  }

  if (mimetype === XLSX_MIME || extension === 'xlsx') {
    return { category: 'xlsx', canPreview: true }
  }

  return { category: 'unsupported', canPreview: false, reason: 'unsupported' }
}
