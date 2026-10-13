import { describe, expect, it } from 'vitest'

import {
  createDriveListingCache,
  listingCacheKey,
  ROOT_LISTING_KEY,
} from '@/src/modules/documents/domain/drive-listing-cache'
import type { DriveFolderListing } from '@/src/modules/documents/domain/types'

const listing = (id: string): DriveFolderListing => ({
  items: [],
  breadcrumbs: [{ id, name: id }],
  currentFolderId: id,
})

describe('createDriveListingCache', () => {
  it('devuelve lo guardado y undefined para lo desconocido', () => {
    const cache = createDriveListingCache()
    cache.set('a', listing('a'))

    expect(cache.get('a')).toEqual(listing('a'))
    expect(cache.get('b')).toBeUndefined()
  })

  it('guardar de nuevo la misma clave sustituye el listado', () => {
    const cache = createDriveListingCache()
    cache.set('a', listing('a'))
    const newer = { ...listing('a'), nextPageToken: 'x' }
    cache.set('a', newer)

    expect(cache.get('a')).toBe(newer)
  })

  it('al pasar el tope cae la entrada menos usada, no la más reciente', () => {
    const cache = createDriveListingCache(2)
    cache.set('a', listing('a'))
    cache.set('b', listing('b'))
    cache.get('a') // 'a' pasa a ser la más reciente
    cache.set('c', listing('c'))

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBeDefined()
    expect(cache.get('c')).toBeDefined()
  })

  it('el tope por defecto es 50', () => {
    const cache = createDriveListingCache()
    for (let i = 0; i < 51; i += 1) cache.set(`k${i}`, listing(`k${i}`))

    expect(cache.get('k0')).toBeUndefined()
    expect(cache.get('k1')).toBeDefined()
    expect(cache.get('k50')).toBeDefined()
  })
})

describe('listingCacheKey', () => {
  it('Inicio sin id usa la clave de raíz; una carpeta usa su id', () => {
    expect(listingCacheKey(undefined)).toBe(ROOT_LISTING_KEY)
    expect(listingCacheKey('abc')).toBe('abc')
  })
})
