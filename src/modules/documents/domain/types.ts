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
  | 'not_configured'
  | 'session_expired'
  | 'duplicate'
  | 'rate_limited'
  | 'timeout'
  | 'storage_full'
  | 'not_downloadable'
  | 'unexpected'
  | 'name_conflict'
  | 'too_large'
  | 'invalid_name'
  | 'invalid_type'
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

/** Archivo ya existente que impide una subida (mismo nombre en la jerarquía hacia abajo). */
export type DriveDuplicate = {
  name: string
  /**
   * Carpetas por debajo de la raíz del cliente hasta donde ya está el archivo,
   * p. ej. ["Facturas", "2026"]. Vacío = en la raíz. El nombre real de la
   * carpeta raíz nunca se expone: la interfaz la muestra como «Inicio».
   */
  folders: string[]
  /** `true` si el choque es entre dos archivos de la misma selección. */
  inSelection?: boolean
}

export type DriveUploadResult =
  | { ok: true; uploaded: DriveItem[] }
  | { ok: false; error: DriveDocumentErrorCode; duplicate?: DriveDuplicate }
