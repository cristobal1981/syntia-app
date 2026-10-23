import { beforeEach, describe, expect, it, vi } from 'vitest'

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }))

import {
  invalidatePortalCachesForEvent,
  portalCacheTagsForEvent,
} from '@/src/modules/portal/infrastructure/portal-cache-invalidation'

const P = 1233

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('portalCacheTagsForEvent', () => {
  it('un mensaje deja vieja solo la caché de chatter sin leer', () => {
    expect(portalCacheTagsForEvent({ kind: 'message', scope: 'tramite', partnerId: P })).toEqual([
      `chatter-unread-batch:${P}`,
    ])
  })

  it('un cambio de estado de un trámite o consulta deja viejo su snapshot', () => {
    for (const scope of ['tramite', 'consulta'] as const) {
      expect(portalCacheTagsForEvent({ kind: 'status', scope, partnerId: P })).toEqual([
        `tramites-snapshot:${P}`,
      ])
    }
  })

  it('un cambio de estado de una obligación deja viejos el índice, el snapshot de avisos y el árbol de la pantalla', () => {
    expect(portalCacheTagsForEvent({ kind: 'status', scope: 'obligacion', partnerId: P }).sort()).toEqual(
      [
        `obligacion-notification-snapshot:${P}`,
        `obligacion-task-index:${P}`,
        `obligacion-tree:${P}`,
      ].sort()
    )
  })

  it('un trámite o consulta nuevos dejan viejo el snapshot de trámites', () => {
    expect(portalCacheTagsForEvent({ kind: 'new_record', scope: 'consulta', partnerId: P })).toEqual([
      `tramites-snapshot:${P}`,
    ])
  })

  it('un cambio de responsable deja viejo el snapshot de trámites (es donde viven los asignados)', () => {
    expect(portalCacheTagsForEvent({ kind: 'assignee_change', scope: 'tramite', partnerId: P })).toEqual([
      `tramites-snapshot:${P}`,
    ])
  })

  it('una firma nueva deja vieja la de firmas pendientes', () => {
    expect(portalCacheTagsForEvent({ kind: 'new_firma', scope: 'firma', partnerId: P })).toEqual([
      `pending-signatures-snapshot:${P}`,
    ])
  })

  it('«vence pronto» es por fecha y no invalida nada', () => {
    expect(portalCacheTagsForEvent({ kind: 'firma_due_soon', scope: 'firma', partnerId: P })).toEqual([])
  })

  it('las etiquetas son del cliente del evento, no de otro', () => {
    const tags = portalCacheTagsForEvent({ kind: 'status', scope: 'obligacion', partnerId: 7 })
    expect(tags.every((tag) => tag.endsWith(':7'))).toBe(true)
  })
})

describe('invalidatePortalCachesForEvent', () => {
  it('caduca cada etiqueta al instante', () => {
    invalidatePortalCachesForEvent({ kind: 'status', scope: 'obligacion', partnerId: P })
    expect(revalidateTag).toHaveBeenCalledTimes(3)
    expect(revalidateTag).toHaveBeenCalledWith(`obligacion-tree:${P}`, { expire: 0 })
  })

  it('sin etiquetas no llama a nada', () => {
    invalidatePortalCachesForEvent({ kind: 'firma_due_soon', scope: 'firma', partnerId: P })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('si Next falla, no lanza: el evento ya está guardado', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('fuera de contexto')
    })
    expect(() =>
      invalidatePortalCachesForEvent({ kind: 'new_record', scope: 'tramite', partnerId: P })
    ).not.toThrow()
  })
})
