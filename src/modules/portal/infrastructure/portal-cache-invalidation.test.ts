import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  revalidateTag,
  forgetRecentTramitesLoad,
  getCachedTramitesSnapshotSafe,
  getCachedObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
} = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  forgetRecentTramitesLoad: vi.fn(),
  getCachedTramitesSnapshotSafe: vi.fn(),
  getCachedObligacionNotificationSnapshotSafe: vi.fn(),
  getCachedPendingSignaturesSnapshotSafe: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/cached-client-odoo-access')>()),
  forgetRecentTramitesLoad,
  getCachedTramitesSnapshotSafe,
  getCachedObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
}))

import {
  invalidatePortalCachesForEvent,
  portalCacheTagsForEvent,
  portalSnapshotsToWarmForEvent,
  warmPortalCachesForEvent,
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

  it('olvida la última carga reutilizable de trámites del cliente del evento, antes de caducar las etiquetas', () => {
    const order: string[] = []
    forgetRecentTramitesLoad.mockImplementation(() => order.push('forget'))
    revalidateTag.mockImplementation(() => order.push('expire'))

    invalidatePortalCachesForEvent({ kind: 'status', scope: 'tramite', partnerId: P })

    expect(forgetRecentTramitesLoad).toHaveBeenCalledWith(P)
    expect(order).toEqual(['forget', 'expire'])
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

describe('portalSnapshotsToWarmForEvent', () => {
  const warm = (kind: Parameters<typeof portalCacheTagsForEvent>[0]['kind'], scope: Parameters<typeof portalCacheTagsForEvent>[0]['scope']) =>
    portalSnapshotsToWarmForEvent({ kind, scope, partnerId: P })

  it('un mensaje o un vencimiento por fecha no calientan nada', () => {
    expect(warm('message', 'tramite')).toEqual([])
    expect(warm('firma_due_soon', 'firma')).toEqual([])
  })

  it('estado de trámite o consulta, trámite nuevo y cambio de responsable calientan trámites', () => {
    expect(warm('status', 'tramite')).toEqual(['tramites'])
    expect(warm('status', 'consulta')).toEqual(['tramites'])
    expect(warm('new_record', 'consulta')).toEqual(['tramites'])
    expect(warm('assignee_change', 'tramite')).toEqual(['tramites'])
  })

  it('estado de una obligación calienta obligaciones; firma nueva, firmas', () => {
    expect(warm('status', 'obligacion')).toEqual(['obligaciones'])
    expect(warm('new_firma', 'firma')).toEqual(['firmas'])
  })
})

describe('warmPortalCachesForEvent', () => {
  it('lee solo los snapshots que corresponden, de ese cliente', async () => {
    getCachedTramitesSnapshotSafe.mockResolvedValue({ data: {} })

    await warmPortalCachesForEvent({ kind: 'status', scope: 'tramite', partnerId: P })

    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledWith(P)
    expect(getCachedObligacionNotificationSnapshotSafe).not.toHaveBeenCalled()
    expect(getCachedPendingSignaturesSnapshotSafe).not.toHaveBeenCalled()
  })

  it('un mensaje no lee nada de Odoo', async () => {
    await warmPortalCachesForEvent({ kind: 'message', scope: 'tramite', partnerId: P })

    expect(getCachedTramitesSnapshotSafe).not.toHaveBeenCalled()
  })

  it('una ráfaga del mismo cliente comparte la lectura en marcha; otro cliente no', async () => {
    const finishers: Array<() => void> = []
    getCachedTramitesSnapshotSafe.mockImplementation(
      () => new Promise<void>((resolve) => finishers.push(resolve))
    )
    const event = { kind: 'status', scope: 'tramite', partnerId: P } as const

    const first = warmPortalCachesForEvent(event)
    const second = warmPortalCachesForEvent(event)
    const other = warmPortalCachesForEvent({ ...event, partnerId: P + 1 })

    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledTimes(2)
    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledWith(P)
    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledWith(P + 1)

    finishers.forEach((finish) => finish())
    await Promise.all([first, second, other])
  })

  it('terminada una lectura, un evento posterior vuelve a leer', async () => {
    getCachedTramitesSnapshotSafe.mockResolvedValue({ data: {} })
    const event = { kind: 'new_record', scope: 'consulta', partnerId: P } as const

    await warmPortalCachesForEvent(event)
    await warmPortalCachesForEvent(event)

    expect(getCachedTramitesSnapshotSafe).toHaveBeenCalledTimes(2)
  })

  it('si la lectura falla no lanza y lo registra', async () => {
    getCachedTramitesSnapshotSafe.mockRejectedValue(new Error('odoo caído'))

    await expect(
      warmPortalCachesForEvent({ kind: 'status', scope: 'tramite', partnerId: P })
    ).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})
