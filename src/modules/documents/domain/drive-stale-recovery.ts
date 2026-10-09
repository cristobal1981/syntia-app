import {
  SECTION_FATAL_CODES,
  type DriveErrorContext,
  type DriveUiErrorCode,
} from '@/src/modules/documents/domain/drive-error-presentation'

export type FolderLoadFailurePlan = {
  /** ¿Se conserva la lista que ya veía la persona o se sustituye por el aviso? */
  listing: 'keep' | 'clear'
  /** Acción automática para sincronizar con Drive tras el fallo. */
  fallback: 'none' | 'refresh-current' | 'go-home'
  context: DriveErrorContext
}

/**
 * Qué hacer cuando falla cargar una carpeta. El principio: un fallo nunca
 * deja a la persona sin su lista si ya tenía una. Si la carpeta que quería abrir
 * desapareció, se mantiene lo que veía y se refresca en segundo plano; si
 * desapareció la carpeta en la que estaba, se la lleva a Inicio.
 */
export function planFolderLoadFailure(input: {
  code: DriveUiErrorCode
  requestedFolderId: string | undefined
  currentFolderId: string | null
  hasListing: boolean
}): FolderLoadFailurePlan {
  const { code, requestedFolderId, currentFolderId, hasListing } = input

  if (!hasListing || SECTION_FATAL_CODES.has(code)) {
    return { listing: 'clear', fallback: 'none', context: 'load' }
  }

  if (code !== 'not_found') {
    return { listing: 'keep', fallback: 'none', context: 'folder' }
  }

  const wasNavigating = requestedFolderId !== undefined && requestedFolderId !== currentFolderId
  if (wasNavigating) {
    return { listing: 'keep', fallback: 'refresh-current', context: 'folder' }
  }

  // Estaba refrescando la carpeta actual (o la raíz) y ya no existe.
  return requestedFolderId === undefined
    ? { listing: 'clear', fallback: 'none', context: 'load' }
    : { listing: 'keep', fallback: 'go-home', context: 'home' }
}
