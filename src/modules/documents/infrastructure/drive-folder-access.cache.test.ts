import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { authorizedDriveFetch } = vi.hoisted(() => ({ authorizedDriveFetch: vi.fn() }))

vi.mock('@/src/modules/documents/infrastructure/drive-http', () => ({ authorizedDriveFetch }))

import {
  assertDriveItemWithinClientTree,
  buildDriveBreadcrumbs,
  rememberListedDriveItems,
} from '@/src/modules/documents/infrastructure/drive-folder-access'

type Meta = { name: string; parents: string[]; trashed?: boolean }

let tree: Map<string, Meta>
let fetched: string[]
let seq = 0
let clock = Date.parse('2031-01-01T00:00:00Z')

/** Ids únicos por prueba: la caché vive en el módulo y no se reinicia entre pruebas. */
function ids(count: number): string[] {
  seq += 1
  return Array.from({ length: count }, (_, i) => `T${seq}_N${String(i).padStart(5, '0')}`)
}

beforeEach(() => {
  vi.useFakeTimers()
  clock += 10 * 60_000
  vi.setSystemTime(new Date(clock))
  fetched = []
  tree = new Map()
  authorizedDriveFetch.mockReset()
  authorizedDriveFetch.mockImplementation(async (url: string) => {
    const id = decodeURIComponent(/\/files\/([^?]+)\?/.exec(url)![1])
    fetched.push(id)
    const meta = tree.get(id)
    if (!meta) return new Response('{}', { status: 404 })
    return new Response(
      JSON.stringify({
        id,
        name: meta.name,
        parents: meta.parents,
        trashed: meta.trashed ?? false,
      }),
      { status: 200 }
    )
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('caché de metadatos de carpetas', () => {
  it('hermanas bajo el mismo padre: la cadena de padres se consulta una sola vez', async () => {
    const [root, parent, a, b] = ids(4)
    tree.set(parent, { name: 'p', parents: [root] })
    tree.set(a, { name: 'a', parents: [parent] })
    tree.set(b, { name: 'b', parents: [parent] })

    await assertDriveItemWithinClientTree(a, root)
    await assertDriveItemWithinClientTree(b, root)

    expect(fetched).toEqual([a, parent, b])
  })

  it('lo que trae un listado no se vuelve a pedir a Drive', async () => {
    const [root, child] = ids(2)

    rememberListedDriveItems(root, [{ id: child, name: 'c', parents: [root] }])
    await assertDriveItemWithinClientTree(child, root)

    expect(fetched).toEqual([])
  })

  it('un elemento del listado sin parents (o con id raro) no se recuerda', async () => {
    const [root, noParents] = ids(2)
    tree.set(noParents, { name: 'x', parents: [root] })

    rememberListedDriveItems(root, [
      { id: noParents, name: 'x' },
      { id: 'id con espacios', name: 'y', parents: [root] },
      { name: 'sin id', parents: [root] },
    ])
    await assertDriveItemWithinClientTree(noParents, root)

    expect(fetched).toEqual([noParents])
  })

  it('la caché es por raíz: lo recordado para un cliente no vale para otro', async () => {
    const [rootA, rootB, child] = ids(3)
    tree.set(child, { name: 'c', parents: [rootA] })
    rememberListedDriveItems(rootA, [{ id: child, name: 'c', parents: [rootA] }])

    // Ambos errores se presentan como «no encontrado»; lo que importa es que no entra
    // y que hubo que preguntar a Drive (no se aprovechó lo recordado para A).
    await expect(assertDriveItemWithinClientTree(child, rootB)).rejects.toThrow(
      /DRIVE_(ACCESS_FORBIDDEN|ITEM_NOT_FOUND)/
    )
    expect(fetched[0]).toBe(child)
  })

  it('caduca a los 60 s: pasado ese tiempo se vuelve a preguntar a Drive', async () => {
    const [root, child] = ids(2)
    tree.set(child, { name: 'c', parents: [root] })

    await assertDriveItemWithinClientTree(child, root)
    vi.setSystemTime(new Date(clock + 59_000))
    await assertDriveItemWithinClientTree(child, root)
    expect(fetched).toHaveLength(1)

    vi.setSystemTime(new Date(clock + 61_000))
    await assertDriveItemWithinClientTree(child, root)
    expect(fetched).toHaveLength(2)
  })

  it('una decisión nunca vive más que el metadato en que se apoya (los plazos no se suman)', async () => {
    const [root, child] = ids(2)
    rememberListedDriveItems(root, [{ id: child, name: 'c', parents: [root] }])
    tree.set(child, { name: 'c', parents: [root], trashed: true })

    // A los 30 s se decide con el metadato cacheado (aún válido 30 s más)…
    vi.setSystemTime(new Date(clock + 30_000))
    await assertDriveItemWithinClientTree(child, root)
    expect(fetched).toEqual([])

    // …pero la decisión no puede sobrevivir al metadato: a los 61 s ya se revalida.
    vi.setSystemTime(new Date(clock + 61_000))
    await expect(assertDriveItemWithinClientTree(child, root)).rejects.toThrow(
      'DRIVE_ITEM_NOT_FOUND'
    )
    expect(fetched).toEqual([child])
  })

  it('un elemento en la papelera no se recuerda: cada acceso lo vuelve a comprobar', async () => {
    const [root, child] = ids(2)
    tree.set(child, { name: 'c', parents: [root], trashed: true })

    await expect(assertDriveItemWithinClientTree(child, root)).rejects.toThrow()
    await expect(assertDriveItemWithinClientTree(child, root)).rejects.toThrow()

    expect(fetched).toEqual([child, child])
  })

  it('la caché está acotada: pasado el tope caen las entradas más antiguas', async () => {
    const all = ids(5200)
    const root = all[0]
    const items = all.slice(1).map((id) => ({ id, name: id, parents: [root] }))
    for (const id of items.map((item) => item.id)) tree.set(id, { name: id, parents: [root] })

    rememberListedDriveItems(root, items)

    // La más antigua ya no está (hay que preguntar); la más reciente sí.
    await assertDriveItemWithinClientTree(items[0].id, root)
    expect(fetched).toEqual([items[0].id])
    fetched.length = 0
    await assertDriveItemWithinClientTree(items[items.length - 1].id, root)
    expect(fetched).toEqual([])
  })
})

describe('migas de pan', () => {
  it('el primer tramo es «Inicio» y la raíz no se pide a Drive', async () => {
    const [root, parent, child] = ids(3)
    tree.set(parent, { name: 'Facturas', parents: [root] })
    tree.set(child, { name: '2026', parents: [parent] })

    const crumbs = await buildDriveBreadcrumbs(child, root)

    expect(crumbs).toEqual([
      { id: root, name: 'Inicio' },
      { id: parent, name: 'Facturas' },
      { id: child, name: '2026' },
    ])
    expect(fetched).not.toContain(root)
  })

  it('tras comprobar el acceso, las migas no repiten ninguna consulta', async () => {
    const [root, parent, child] = ids(3)
    tree.set(parent, { name: 'Facturas', parents: [root] })
    tree.set(child, { name: '2026', parents: [parent] })

    await assertDriveItemWithinClientTree(child, root)
    const before = fetched.length
    await buildDriveBreadcrumbs(child, root)

    expect(fetched.length).toBe(before)
  })

  it('con varios padres sube por el que lleva a la raíz del cliente (no filtra nombres de arriba)', async () => {
    const [root, priv, multi] = ids(3)
    tree.set(priv, { name: 'Privada', parents: ['OTRA_RAIZ_FUERA_00001'] })
    tree.set(multi, { name: 'Multi', parents: [priv, root] })

    const crumbs = await buildDriveBreadcrumbs(multi, root)

    expect(JSON.stringify(crumbs)).not.toContain('Privada')
    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Inicio', 'Multi'])
  })
})
