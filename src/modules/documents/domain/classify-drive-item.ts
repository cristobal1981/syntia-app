import type { DriveItem, DriveItemKind } from '@/src/modules/documents/domain/types'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet'
const GOOGLE_SLIDE_MIME = 'application/vnd.google-apps.presentation'

function extensionFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function classifyDriveItemMime(mimeType: string, name: string): DriveItemKind {
  const mime = mimeType.toLowerCase()
  const extension = extensionFromName(name)

  if (mime === FOLDER_MIME) return 'folder'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (mime === DOCX_MIME || extension === 'docx') return 'docx'
  if (mime === XLSX_MIME || extension === 'xlsx') return 'xlsx'
  if (mime === GOOGLE_DOC_MIME) return 'google-doc'
  if (mime === GOOGLE_SHEET_MIME) return 'google-sheet'
  if (mime === GOOGLE_SLIDE_MIME) return 'google-slide'

  return 'unsupported'
}

export function mapDriveApiFileToItem(file: {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
  iconLink?: string
  thumbnailLink?: string
}): DriveItem {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedAt: file.modifiedTime ?? new Date().toISOString(),
    size: file.size ? Number(file.size) : undefined,
    iconLink: file.iconLink,
    thumbnailLink: file.thumbnailLink,
    kind: classifyDriveItemMime(file.mimeType, file.name),
  }
}

export function isDriveFolder(item: Pick<DriveItem, 'kind' | 'mimeType'>): boolean {
  return item.kind === 'folder'
}
