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
  getCachedTramitesSnapshot,
  getCachedPendingSignaturesSnapshot,
  isSnapshotLoadedWithin,
  forgetRecentTramitesLoad,
  expireClientPortalCaches,
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

  beforeEach(() => {
    // Cada test lee como si no hubiera una carga reciente de este cliente.
    forgetRecentTramitesLoad(7)
  })

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

describe('edad de lo cargado contra Odoo (isSnapshotLoadedWithin)', () => {
  it('sin ninguna carga registrada para ese cliente no hay nada reciente', () => {
    expect(isSnapshotLoadedWithin('tramites', 9001, 20_000)).toBe(false)
    expect(isSnapshotLoadedWithin('obligaciones', 9001, 20_000)).toBe(false)
    expect(isSnapshotLoadedWithin('firmas', 9001, 20_000)).toBe(false)
  })

  it('tras cargar trámites es reciente dentro del margen y deja de serlo pasado el margen', async () => {
    fetchTramitesFromOdoo.mockResolvedValue({ tasks: [], tickets: [], tagFilterActive: false })
    const before = Date.now()

    await getCachedTramitesSnapshot(9002)

    expect(isSnapshotLoadedWithin('tramites', 9002, 20_000, before + 19_000)).toBe(true)
    expect(isSnapshotLoadedWithin('tramites', 9002, 20_000, before + 25_000)).toBe(false)
  })

  it('es por cliente y por snapshot: cargar uno no marca a otro cliente ni a otro snapshot', async () => {
    fetchTramitesFromOdoo.mockResolvedValue({ tasks: [], tickets: [], tagFilterActive: false })

    await getCachedTramitesSnapshot(9003)

    expect(isSnapshotLoadedWithin('tramites', 9003, 20_000)).toBe(true)
    expect(isSnapshotLoadedWithin('tramites', 9004, 20_000)).toBe(false)
    expect(isSnapshotLoadedWithin('firmas', 9003, 20_000)).toBe(false)
  })

  it('una carga que falla no cuenta como reciente', async () => {
    fetchTramitesFromOdoo.mockRejectedValue(new Error('ODOO_REQUEST_FAILED'))

    await expect(getCachedTramitesSnapshot(9005)).rejects.toThrow()

    expect(isSnapshotLoadedWithin('tramites', 9005, 20_000)).toBe(false)
  })

  it('las firmas y las obligaciones también registran su carga', async () => {
    fetchPendingSignaturesFromOdoo.mockResolvedValue([])
    buildObligacionTaskIndex.mockResolvedValue({ leaves: [] })
    fetchClientProjectIds.mockResolvedValue([])

    await getCachedPendingSignaturesSnapshot(9006)
    await getCachedObligacionNotificationSnapshot(9006)

    expect(isSnapshotLoadedWithin('firmas', 9006, 20_000)).toBe(true)
    expect(isSnapshotLoadedWithin('obligaciones', 9006, 20_000)).toBe(true)
  })
})

describe('carga única: las cargas simultáneas del mismo snapshot comparten una sola lectura', () => {
  const snapshot = { tasks: [], tickets: [], tagFilterActive: true }

  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  it('dos peticiones a la vez del mismo cliente leen de Odoo una sola vez y reciben lo mismo', async () => {
    const gate = deferred<typeof snapshot>()
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockReturnValue(gate.promise)

    const first = getCachedTramitesSnapshot(8101)
    const second = getCachedTramitesSnapshot(8101)
    const third = getFreshTramitesSnapshotSafe(8101)
    gate.resolve(snapshot)

    expect(await first).toBe(snapshot)
    expect(await second).toBe(snapshot)
    expect((await third).data).toBe(snapshot)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(1)
  })

  it('una petición posterior pasado el plazo de reutilización vuelve a leer (no se queda con lo viejo)', async () => {
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)

    await getCachedTramitesSnapshot(8102)
    now.mockReturnValue(1_000_000 + 4_999)
    await getCachedTramitesSnapshot(8102)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(1)

    now.mockReturnValue(1_000_000 + 5_000)
    await getCachedTramitesSnapshot(8102)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('una carga que acaba de terminar se reutiliza unos segundos (la 2ª tanda del repintado tras el sondeo)', async () => {
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    const first = await getFreshTramitesSnapshotSafe(8108)
    const rendered = await getCachedTramitesSnapshot(8108)

    expect(rendered).toBe(first.data)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(1)
  })

  it('olvidar la última carga obliga a leer de nuevo (algo acaba de cambiar: crear una consulta)', async () => {
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    await getCachedTramitesSnapshot(8109)
    forgetRecentTramitesLoad(8109)
    await getCachedTramitesSnapshot(8109)

    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('olvidar la carga de un cliente no afecta a la de otro', async () => {
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    await getCachedTramitesSnapshot(8110)
    await getCachedTramitesSnapshot(8111)
    forgetRecentTramitesLoad(8110)
    await getCachedTramitesSnapshot(8111)

    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('una carga fallida no se reutiliza', async () => {
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockRejectedValueOnce(new Error('ODOO_REQUEST_FAILED'))
    fetchTramitesFromOdoo.mockResolvedValueOnce(snapshot)

    await expect(getCachedTramitesSnapshot(8112)).rejects.toThrow()

    expect(await getCachedTramitesSnapshot(8112)).toBe(snapshot)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('las firmas no se reutilizan una vez terminadas: solo se comparte la carga en marcha', async () => {
    fetchPendingSignaturesFromOdoo.mockReset()
    fetchPendingSignaturesFromOdoo.mockResolvedValue([])

    await getCachedPendingSignaturesSnapshot(8113)
    await getCachedPendingSignaturesSnapshot(8113)

    expect(fetchPendingSignaturesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('clientes distintos no comparten la carga', async () => {
    const gate = deferred<typeof snapshot>()
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockReturnValue(gate.promise)

    const a = getCachedTramitesSnapshot(8103)
    const b = getCachedTramitesSnapshot(8104)
    gate.resolve(snapshot)
    await Promise.all([a, b])

    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledWith(8103)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledWith(8104)
  })

  it('si la carga falla, todos los que esperaban reciben el error y el siguiente intento lee de nuevo', async () => {
    const gate = deferred<typeof snapshot>()
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockReturnValueOnce(gate.promise)

    const first = getCachedTramitesSnapshot(8105)
    const second = getCachedTramitesSnapshot(8105)
    const settled = Promise.allSettled([first, second])
    gate.reject(new Error('ODOO_REQUEST_FAILED'))
    const results = await settled

    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected'])
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(1)

    fetchTramitesFromOdoo.mockResolvedValueOnce(snapshot)
    expect(await getCachedTramitesSnapshot(8105)).toBe(snapshot)
    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('las firmas pendientes también comparten la lectura en marcha', async () => {
    const gate = deferred<unknown[]>()
    fetchPendingSignaturesFromOdoo.mockReset()
    fetchPendingSignaturesFromOdoo.mockReturnValue(gate.promise)

    const a = getCachedPendingSignaturesSnapshot(8106)
    const b = getFreshPendingSignaturesSnapshotSafe(8106)
    gate.resolve([])
    await Promise.all([a, b])

    expect(fetchPendingSignaturesFromOdoo).toHaveBeenCalledTimes(1)
  })

  it('el índice de obligaciones comparte la lectura entre el snapshot de avisos y el árbol de tareas', async () => {
    const gate = deferred<{ excludedTaskIds: number[]; leaves: unknown[] }>()
    buildObligacionTaskIndex.mockReset()
    buildObligacionTaskIndex.mockReturnValue(gate.promise)
    fetchClientProjectIds.mockResolvedValue([1])

    const a = getCachedObligacionNotificationSnapshot(8107)
    const b = getCachedObligacionNotificationSnapshot(8107)
    gate.resolve({ excludedTaskIds: [], leaves: [] })
    await Promise.all([a, b])

    expect(buildObligacionTaskIndex).toHaveBeenCalledTimes(1)
  })
})

describe('expireClientPortalCaches («Actualizar» del usuario)', () => {
  it('expira todas las cachés de lo que se ve de ese cliente, y solo de ese cliente', () => {
    expect(expireClientPortalCaches(7)).toBe(true)

    const tags = updateTag.mock.calls.map(([tag]) => tag).sort()
    expect(tags).toEqual(
      [
        'tramites-snapshot:7',
        'client-project-ids:7',
        'obligacion-task-index:7',
        'obligacion-tree:7',
        'obligacion-notification-snapshot:7',
        'pending-signatures-snapshot:7',
        'signature-history-snapshot:7',
        'chatter-unread-batch:7',
      ].sort()
    )
    expect(tags.every((tag) => tag.endsWith(':7'))).toBe(true)
  })

  it('no toca la caché del cliente de Odoo del usuario (identidad)', () => {
    expireClientPortalCaches(7)

    expect(updateTag.mock.calls.some(([tag]) => String(tag).startsWith('client-odoo-partner'))).toBe(
      false
    )
  })

  it('olvida la última carga de trámites: si no, se reutilizaría 5 s y «Actualizar» no leería de Odoo', async () => {
    const snapshot = { tasks: [], tickets: [], tagFilterActive: false }
    fetchTramitesFromOdoo.mockReset()
    fetchTramitesFromOdoo.mockResolvedValue(snapshot)

    await getCachedTramitesSnapshot(8120)
    expireClientPortalCaches(8120)
    await getCachedTramitesSnapshot(8120)

    expect(fetchTramitesFromOdoo).toHaveBeenCalledTimes(2)
  })

  it('fuera de una Server Action (updateTag lanza) devuelve false sin romper', () => {
    updateTag.mockImplementation(() => {
      throw new Error('fuera de una acción')
    })

    expect(expireClientPortalCaches(7)).toBe(false)
  })
})
