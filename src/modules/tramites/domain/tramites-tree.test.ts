import { describe, expect, it } from 'vitest'

import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  buildTramiteTree,
  collectVisibleDescendants,
  findRootContaining,
  flattenTramiteTree,
  getDirectSubtasks,
  getParentTramite,
  getVisualDepth,
} from '@/src/modules/tramites/domain/tramites-tree'

function task(id: number, parentId?: number, over: Partial<TramiteListItem> = {}): TramiteListItem {
  return {
    id,
    name: `t${id}`,
    kind: 'tramite',
    isClosed: false,
    attachmentCount: 0,
    modifiedAt: '',
    assignedNotifyPartnerIds: [],
    createdAt: '',
    priority: 0,
    assignees: [],
    parentId,
    ...over,
  }
}
const ticket = (id: number): TramiteListItem => ({ ...task(id), kind: 'consulta', parentId: undefined })
const ids = (nodes: { item: TramiteListItem }[]) => nodes.map((n) => n.item.id)

describe('buildTramiteTree', () => {
  it('anida una subtarea bajo su padre cuando ambos son visibles', () => {
    const all = [task(1), task(2, 1), task(3, 1)]
    const roots = buildTramiteTree(all, all)
    expect(ids(roots)).toEqual([1])
    expect(ids(roots[0]!.children)).toEqual([2, 3])
  })

  it('una subtarea cuyo padre no está en la lista hace de raíz', () => {
    const roots = buildTramiteTree([task(2, 99)], [task(2, 99)])
    expect(ids(roots)).toEqual([2])
  })

  it('si el padre está oculto sube al hijo, y si hay abuelo visible cuelga de él', () => {
    const all = [task(1), task(2, 1, { isClosed: true }), task(3, 2)]
    const visible = [all[0]!, all[2]!]
    const roots = buildTramiteTree(visible, all)
    expect(ids(roots)).toEqual([1])
    expect(ids(roots[0]!.children)).toEqual([3])

    const onlyChild = buildTramiteTree([all[2]!], all)
    expect(ids(onlyChild)).toEqual([3])
  })

  it('las consultas nunca cuelgan de una tarea con el mismo id', () => {
    const all = [task(1), ticket(1)]
    const roots = buildTramiteTree(all, all)
    expect(roots).toHaveLength(2)
  })

  it('una consulta con un parentId suelto no se anida ni cuenta como subtarea', () => {
    const stray = { ...ticket(5), parentId: 1 }
    const all = [task(1), stray]
    const roots = buildTramiteTree(all, all)
    expect(ids(roots)).toEqual([1, 5])
    expect(roots[0]!.descendantTotal).toBe(0)
    expect(getDirectSubtasks(all, all[0]!)).toEqual([])
  })

  it('cuenta las subtareas de todo el árbol aunque estén ocultas', () => {
    const all = [task(1), task(2, 1, { isClosed: true }), task(3, 2, { isClosed: true }), task(4, 1)]
    const roots = buildTramiteTree([all[0]!], all)
    expect(roots[0]!.descendantTotal).toBe(3)
    expect(roots[0]!.descendantClosed).toBe(2)
  })

  it('una novedad en un hijo sube a su padre en el orden', () => {
    const all = [task(10), task(1), task(2, 1)]
    // `visible` llega ordenado por actividad: el hijo 2 (con novedad) va primero.
    const roots = buildTramiteTree([all[2]!, all[0]!, all[1]!], all)
    expect(ids(roots)).toEqual([1, 10])
  })

  it('un ciclo no hace desaparecer a nadie ni cuelga el proceso', () => {
    const all = [task(1, 2), task(2, 1)]
    const roots = buildTramiteTree(all, all)
    const flat = flattenTramiteTree(roots, () => true)
    expect(new Set(flat.map((r) => r.node.item.id))).toEqual(new Set([1, 2]))
  })

  it('un trámite que es su propio padre se trata como raíz', () => {
    expect(ids(buildTramiteTree([task(1, 1)], [task(1, 1)]))).toEqual([1])
  })
})

describe('flattenTramiteTree y utilidades', () => {
  const all = [task(1), task(2, 1), task(3, 2), task(4)]
  const roots = buildTramiteTree(all, all)

  it('plegado solo pinta raíces; desplegado, hijos con su profundidad', () => {
    expect(flattenTramiteTree(roots, () => false).map((r) => r.node.item.id)).toEqual([1, 4])
    const open = flattenTramiteTree(roots, () => true)
    expect(open.map((r) => [r.node.item.id, r.depth])).toEqual([[1, 0], [2, 1], [3, 2], [4, 0]])
  })

  it('despliega solo los nodos que se piden', () => {
    const rows = flattenTramiteTree(roots, (n) => n.item.id === 1)
    expect(rows.map((r) => r.node.item.id)).toEqual([1, 2, 4])
  })

  it('la sangría se queda en 2 niveles', () => {
    expect([0, 1, 2, 3, 7].map(getVisualDepth)).toEqual([0, 1, 2, 2, 2])
  })

  it('collectVisibleDescendants y findRootContaining', () => {
    expect(collectVisibleDescendants(roots[0]!).map((i) => i.id)).toEqual([2, 3])
    expect(findRootContaining(roots, { id: 3, kind: 'tramite' })?.item.id).toBe(1)
    expect(findRootContaining(roots, { id: 3, kind: 'consulta' })).toBeNull()
  })

  it('getDirectSubtasks y getParentTramite miran la lista completa', () => {
    expect(getDirectSubtasks(all, all[0]!).map((i) => i.id)).toEqual([2])
    expect(getParentTramite(all, all[2]!)?.id).toBe(2)
    expect(getParentTramite(all, all[0]!)).toBeNull()
    expect(getDirectSubtasks(all, ticket(1))).toEqual([])
  })
})
