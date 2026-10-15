const DRIVE_FOLDER_PARAM = 'carpeta'

/** Tope defensivo: el servidor valida el formato real del id, esto solo evita basura enorme. */
const MAX_FOLDER_PARAM_LENGTH = 128

/** Id de carpeta pedido en la URL; `null` si no hay (Inicio) o no es plausible. */
export function parseFolderParam(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value || value.length > MAX_FOLDER_PARAM_LENGTH) return null
  return value
}

/**
 * URL de Documentos para una carpeta. `folderId` null es Inicio (sin parámetro).
 * Conserva el resto de parámetros de la query.
 */
export function buildFolderUrl(
  pathname: string,
  search: string,
  folderId: string | null
): string {
  const params = new URLSearchParams(search)
  if (folderId) {
    params.set(DRIVE_FOLDER_PARAM, folderId)
  } else {
    params.delete(DRIVE_FOLDER_PARAM)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
