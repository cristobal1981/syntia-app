import { beforeEach, describe, expect, it, vi } from 'vitest'

const { buildObligacionTaskIndex, fetchClientProjectIds, odooSearchRead, fetchObligacionesFromOdoo } = vi.hoisted(() => ({
  buildObligacionTaskIndex: vi.fn(),
  fetchObligacionesFromOdoo: vi.fn(),
  fetchClientProjectIds: vi.fn(),
  odooSearchRead: vi.fn(),
}))

vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
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
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

const leaf = { id: 11, name: 'Modelo 420', modifiedAt: '2026-10-22', state: '01_in_progress' }

beforeEach(() => {
  vi.resetAllMocks()
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
