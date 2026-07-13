export type DriveItemKind =
  | 'folder'
  | 'image'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'google-doc'
  | 'google-sheet'
  | 'google-slide'
  | 'unsupported'

export type DriveItem = {
  id: string
  name: string
  mimeType: string
  modifiedAt: string
  size?: number
  iconLink?: string
  thumbnailLink?: string
  kind: DriveItemKind
}

export type DriveBreadcrumb = {
  id: string
  name: string
}

export type DriveFolderListing = {
  items: DriveItem[]
  breadcrumbs: DriveBreadcrumb[]
  currentFolderId: string
  nextPageToken?: string
}

export type DriveDocumentErrorCode =
  | 'forbidden'
  | 'not_linked'
  | 'not_found'
  | 'drive_unavailable'
  | 'name_conflict'
  | 'too_large'
  | 'invalid_name'
  | 'upload_failed'

export type DriveFolderListResult =
  | { ok: true; listing: DriveFolderListing }
  | { ok: false; error: DriveDocumentErrorCode }

export type DriveFileDownloadResult =
  | {
      ok: true
      filename: string
      mimetype: string
      dataBase64: string
    }
  | { ok: false; error: DriveDocumentErrorCode }

export type DriveItemMutationResult =
  | { ok: true; item: DriveItem }
  | { ok: false; error: DriveDocumentErrorCode }

export type DriveDeleteResult =
  | { ok: true }
  | { ok: false; error: DriveDocumentErrorCode }

export type DriveUploadResult =
  | { ok: true; uploaded: DriveItem[] }
  | { ok: false; error: DriveDocumentErrorCode }
