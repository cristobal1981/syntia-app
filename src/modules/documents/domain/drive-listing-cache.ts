import type { DriveFolderListing } from '@/src/modules/documents/domain/types'

/** Clave de Inicio cuando todavía no se conoce el id de la raíz. */
export const ROOT_LISTING_KEY = '__root__'

const MAX_CACHED_LISTINGS = 50

export type DriveListingCache = {
  get: (key: string) => DriveFolderListing | undefined
  set: (key: string, listing: DriveFolderListing) => void
}

/**
 * Carpetas ya vistas en esta sesión de navegación, para pintarlas al instante
 * y revalidarlas por detrás. Acotada: las más antiguas se descartan.
 */
export function createDriveListingCache(
  maxEntries: number = MAX_CACHED_LISTINGS
): DriveListingCache {
  const entries = new Map<string, DriveFolderListing>()

  return {
    get(key) {
      const found = entries.get(key)
      if (!found) return undefined
      // Se reinserta para que lo usado recientemente sea lo último en caer.
      entries.delete(key)
      entries.set(key, found)
      return found
    },
    set(key, listing) {
      entries.delete(key)
      entries.set(key, listing)
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest === undefined) break
        entries.delete(oldest)
      }
    },
  }
}

export function listingCacheKey(folderId: string | undefined): string {
  return folderId ?? ROOT_LISTING_KEY
}
