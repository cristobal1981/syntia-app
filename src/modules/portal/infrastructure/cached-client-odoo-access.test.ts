import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  buildObligacionTaskIndex,
  fetchClientProjectIds,
  odooSearchRead,
  fetchObligacionesFromOdoo,
  updateTag,
  unstableCache,
  fetchTramitesFromOdoo,
  fetchPendingSignaturesFromOdoo,
} = vi.hoisted(() => ({
  updateTag: vi.fn(),
  unstableCache: vi.fn((fn: () => unknown) => fn),
  fetchTramitesFromOdoo: vi.fn(),
  fetchPendingSignaturesFromOdoo: vi.fn(),
  buildObligacionTaskIndex: vi.fn(),
  fetchObligacionesFromOdoo: vi.fn(),
  fetchClientProjectIds: vi.fn(),
  odooSearchRead: vi.fn(),
}))

vi.mock('next/cache', () => ({ unstable_cache: unstableCache, updateTag }))
vi.mock('@/src/modules/tramites/infrastructure/odoo-tramites-repository', () => ({ fetchTramitesFromOdoo }))
vi.mock('@/src/modules/firmas/infrastructure/odoo-sign-repository', () => ({
  fetchPendingSignaturesFromOdoo,
  fetchSignatureHistoryFromOdoo: vi.fn(),
}))
vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index', () => ({
  buildObligacionTaskIndex,
}))
vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligaciones-repository', () => ({
  fetchObligacionesFromOdoo,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-client-projects', () => ({ fetchClientProjectIds }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/odoo-json-client')>()),
  odooSearchRead,
}))

import {
  getCachedObligacionNotificationSnapshot,
  getCachedObligacionTree,
  obligacionTreeCacheTag,
  getFreshObligacionNotificationSnapshotSafe,
  getFreshPendingSignaturesSnapshotSafe,
  getFreshTramitesSnapshotSafe,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

const leaf = { id: 11, name: 'Modelo 420', modifiedAt: '2026-10-22', state: '01_in_progress' }

beforeEach(() => {
  vi.resetAllMocks()
  unstableCache.mockImplementation((fn: () => unknown) => fn)
  fetchClientProjectIds.mockResolvedValue([1])
  buildObligacionTaskIndex.mockResolvedValue({ leaves: [leaf], years: [] })
})

describe('snapshot de obligaciones para avisos', () => {
  it('fresco: no pide los adjuntos a Odoo (los documentos ya no avisan) y deja el recuento en 0', async () => {
    const result = await getFreshObligacionNotificationSnapshotSafe(7)

    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(result.data.leaves).toEqual([{ ...leaf, attachmentCount: 0 }])
    expect(result.odooError).toBeUndefined()
  })

  it('cacheado: igual, sin consulta de adjuntos', async () => {
    const result = await getCachedObligacionNotificationSnapshot(7)

    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(result.leaves).toEqual([{ ...leaf, attachmentCount: 0 }])
  })

  it('sin hojas devuelve la lista vacía', async () => {
    buildObligacionTaskIndex.mockResolvedValue({ leaves: [], years: [] })
    expect((await getFreshObligacionNotificationSnapshotSafe(7)).data.leaves).toEqual([])
  })
})

describe('árbol de obligaciones de la pantalla', () => {
  it('lo pide a Odoo para ese cliente y lo devuelve', async () => {
    const tree = { years: [{ year: 2026, label: 'Obligaciones 2026', periods: [] }] }
    fetchObligacionesFromOdoo.mockResolvedValue(tree)

    expect(await getCachedObligacionTree(7)).toEqual(tree)
    expect(fetchObligacionesFromOdoo).toHaveBeenCalledWith(7)
  })

  it('su etiqueta de caché es por cliente, para poder invalidar solo el suyo', () => {
    expect(obligacionTreeCacheTag(7)).toBe('obligacion-tree:7')
    expect(obligacionTreeCacheTag(8)).not.toBe(obligacionTreeCacheTag(7))
  })
})

describe('lectura fresca del sondeo: renueva la caché en vez de saltarla', () => {
  const snapshot = { tasks: [], tickets: [{ id: 1 }], tagFilterActive: true }

  it('trámites: expira la etiqueta del cliente, relee por la caché y lo avisa', async () => {
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    const result = await getFreshTramitesSnapshotSafe(7)

    expect(updateTag).toHaveBeenCalledTimes(1)
    expect(updateTag).toHaveBeenCalledWith('tramites-snapshot:7')
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(1)
    // La relectura pasa por la caché compartida (su clave y su etiqueta), no por una carga suelta.
    expect(unstableCache).toHaveBeenCalledWith(expect.any(Function), ['tramites-snapshot', '7'], {
      revalidate: 90,
      tags: ['tramites-snapshot:7'],
    })
    expect(result).toEqual({ data: snapshot, cacheRefreshed: true })
  })

  it('la etiqueta se expira ANTES de leer (si no, se serviría lo viejo)', async () => {
    const order: string[] = []
    updateTag.mockImplementation(() => order.push('expire'))
    fetchTramitesFromOdoo.mockImplementation(async () => {
      order.push('load')
      return snapshot
    })

    await getFreshTramitesSnapshotSafe(7)

    expect(order).toEqual(['expire', 'load'])
  })

  it('fuera de una Server Action (updateTag lanza) carga directo, como antes, sin marcar la caché como renovada', async () => {
    updateTag.mockImplementation(() => {
      throw new Error('updateTag can only be called from within a Server Action')
    })
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    const result = await getFreshTramitesSnapshotSafe(7)

    expect(result).toEqual({ data: snapshot })
    expect(result.cacheRefreshed).toBeUndefined()
    // Sin poder expirar, no se toca la caché compartida: carga directa.
    expect(unstableCache).not.toHaveBeenCalledWith(expect.any(Function), ['tramites-snapshot', '7'], expect.anything())
  })

  it('si Odoo falla devuelve el vacío con el error y NO dice que renovó la caché', async () => {
    fetchTramitesFromOdoo.mockRejectedValue(new Error('ODOO_REQUEST_FAILED'))

    const result = await getFreshTramitesSnapshotSafe(7)

    expect(result.data).toEqual({ tasks: [], tickets: [], tagFilterActive: false })
    expect(result.odooError).toBe('odoo_unavailable')
    expect(result.cacheRefreshed).toBeUndefined()
  })

  it('obligaciones: expira proyectos, índice y snapshot del cliente, y relee', async () => {
    const result = await getFreshObligacionNotificationSnapshotSafe(7)

    expect(updateTag.mock.calls.map(([tag]) => tag).sort()).toEqual([
      'client-project-ids:7',
      'obligacion-notification-snapshot:7',
      'obligacion-task-index:7',
    ])
    expect(result.cacheRefreshed).toBe(true)
    expect(result.data.leaves).toEqual([{ ...leaf, attachmentCount: 0 }])
  })

  it('firmas pendientes: expira la etiqueta del cliente y relee', async () => {
    fetchPendingSignaturesFromOdoo.mockResolvedValue([{ id: 3 }])

    const result = await getFreshPendingSignaturesSnapshotSafe(7)

    expect(updateTag).toHaveBeenCalledWith('pending-signatures-snapshot:7')
    expect(result).toEqual({ data: { requests: [{ id: 3 }] }, cacheRefreshed: true })
  })

  it('cada cliente expira solo lo suyo', async () => {
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    await getFreshTramitesSnapshotSafe(8)

    expect(updateTag).toHaveBeenCalledWith('tramites-snapshot:8')
    expect(updateTag).not.toHaveBeenCalledWith('tramites-snapshot:7')
  })
})
