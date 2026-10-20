import {
  getTramiteListItemKey,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'

export type TramiteTreeNode = {
  item: TramiteListItem
  /** Hijos visibles directos, en el orden en que deben pintarse. */
  children: TramiteTreeNode[]
  /** Subtareas de TODO el árbol bajo este trámite (visibles o no). */
  descendantTotal: number
  /** De ellas, las cerradas (hechas o canceladas). */
  descendantClosed: number
}

export type TramiteTreeRow = {
  node: TramiteTreeNode
  /** Profundidad real: 0 = raíz. */
  depth: number
}

/** La sangría deja de crecer a partir de este nivel. */
export const MAX_VISUAL_DEPTH = 2

export function getVisualDepth(depth: number): number {
  return Math.min(depth, MAX_VISUAL_DEPTH)
}

type ParentIndex = {
  byTaskId: Map<number, TramiteListItem>
  childrenByTaskId: Map<number, TramiteListItem[]>
}

/** Solo las tareas (trámites) tienen jerarquía; los tickets (consultas) no. */
function indexTasks(all: TramiteListItem[]): ParentIndex {
  const byTaskId = new Map<number, TramiteListItem>()
  const childrenByTaskId = new Map<number, TramiteListItem[]>()
  for (const item of all) {
    if (item.kind === 'tramite') byTaskId.set(item.id, item)
  }
  for (const item of all) {
    if (item.kind !== 'tramite' || item.parentId === undefined) continue
    if (item.parentId === item.id || !byTaskId.has(item.parentId)) continue
    const siblings = childrenByTaskId.get(item.parentId) ?? []
    siblings.push(item)
    childrenByTaskId.set(item.parentId, siblings)
  }
  return { byTaskId, childrenByTaskId }
}

function countDescendants(
  taskId: number,
  index: ParentIndex,
  seen: Set<number>
): { total: number; closed: number } {
  let total = 0
  let closed = 0
  for (const child of index.childrenByTaskId.get(taskId) ?? []) {
    if (seen.has(child.id)) continue
    seen.add(child.id)
    total += 1
    if (child.isClosed) closed += 1
    const below = countDescendants(child.id, index, seen)
    total += below.total
    closed += below.closed
  }
  return { total, closed }
}

/** Hijos directos de un trámite en la lista completa (aunque estén ocultos por filtros). */
export function getDirectSubtasks(
  all: TramiteListItem[],
  item: TramiteListItem
): TramiteListItem[] {
  if (item.kind !== 'tramite') return []
  return indexTasks(all).childrenByTaskId.get(item.id) ?? []
}

/** Padre directo del trámite si está en la lista completa. */
export function getParentTramite(
  all: TramiteListItem[],
  item: TramiteListItem
): TramiteListItem | null {
  if (item.kind !== 'tramite' || item.parentId === undefined) return null
  const parent = indexTasks(all).byTaskId.get(item.parentId)
  return parent && parent.id !== item.id ? parent : null
}

/**
 * Arma el árbol de lo visible. Cada elemento cuelga de su ANTEPASADO VISIBLE
 * más cercano: si el padre no está en `visible` (cerrado y oculto, filtrado,
 * o sin «mostrar en Syntia»), el elemento sube de nivel y hace de raíz.
 * `visible` llega ya ordenado; el orden de cada nivel sigue la posición más
 * temprana de su rama, de modo que una novedad en un hijo sube a su padre.
 */
export function buildTramiteTree(
  visible: TramiteListItem[],
  all: TramiteListItem[]
): TramiteTreeNode[] {
  const index = indexTasks(all)
  const position = new Map<string, number>()
  visible.forEach((item, i) => position.set(getTramiteListItemKey(item), i))

  const nearestVisibleAncestor = (item: TramiteListItem): TramiteListItem | null => {
    if (item.kind !== 'tramite') return null
    const seen = new Set<number>([item.id])
    let current = item
    while (current.parentId !== undefined) {
      const parent = index.byTaskId.get(current.parentId)
      if (!parent || seen.has(parent.id)) return null
      if (position.has(getTramiteListItemKey(parent))) return parent
      seen.add(parent.id)
      current = parent
    }
    return null
  }

  const nodes = new Map<string, TramiteTreeNode>()
  for (const item of visible) {
    const counts =
      item.kind === 'tramite'
        ? countDescendants(item.id, index, new Set([item.id]))
        : { total: 0, closed: 0 }
    nodes.set(getTramiteListItemKey(item), {
      item,
      children: [],
      descendantTotal: counts.total,
      descendantClosed: counts.closed,
    })
  }

  const roots: TramiteTreeNode[] = []
  const parentOf = new Map<TramiteTreeNode, TramiteTreeNode>()
  for (const item of visible) {
    const node = nodes.get(getTramiteListItemKey(item))!
    const ancestor = nearestVisibleAncestor(item)
    const parentNode = ancestor ? nodes.get(getTramiteListItemKey(ancestor)) : undefined
    if (parentNode) {
      parentNode.children.push(node)
      parentOf.set(node, parentNode)
    } else roots.push(node)
  }

  // Si Odoo devolviera un ciclo, sus miembros no cuelgan de ninguna raíz: se
  // rescatan como raíces para que nunca desaparezcan de la lista.
  const reachable = new Set<TramiteTreeNode>()
  const mark = (node: TramiteTreeNode) => {
    if (reachable.has(node)) return
    reachable.add(node)
    node.children.forEach(mark)
  }
  roots.forEach(mark)
  for (const item of visible) {
    const node = nodes.get(getTramiteListItemKey(item))!
    if (!reachable.has(node)) {
      // Se corta el ciclo por este nodo: deja de colgar de su «padre».
      const parent = parentOf.get(node)
      if (parent) parent.children = parent.children.filter((child) => child !== node)
      roots.push(node)
      mark(node)
    }
  }

  const earliest = new Map<TramiteTreeNode, number>()
  const earliestOf = (node: TramiteTreeNode): number => {
    const cached = earliest.get(node)
    if (cached !== undefined) return cached
    let best = position.get(getTramiteListItemKey(node.item)) ?? Infinity
    earliest.set(node, best)
    for (const child of node.children) best = Math.min(best, earliestOf(child))
    earliest.set(node, best)
    return best
  }
  const sortLevel = (level: TramiteTreeNode[]) => {
    level.sort((a, b) => earliestOf(a) - earliestOf(b))
    level.forEach((node) => sortLevel(node.children))
  }
  sortLevel(roots)

  return roots
}

/** Todos los descendientes visibles de un nodo (sin el propio nodo). */
export function collectVisibleDescendants(node: TramiteTreeNode): TramiteListItem[] {
  return node.children.flatMap((child) => [
    child.item,
    ...collectVisibleDescendants(child),
  ])
}

/** Filas en orden de pintado: cada nodo y, si está desplegado, sus hijos debajo. */
export function flattenTramiteTree(
  roots: TramiteTreeNode[],
  isExpanded: (node: TramiteTreeNode) => boolean
): TramiteTreeRow[] {
  const rows: TramiteTreeRow[] = []
  const walk = (node: TramiteTreeNode, depth: number) => {
    rows.push({ node, depth })
    if (node.children.length && isExpanded(node)) {
      node.children.forEach((child) => walk(child, depth + 1))
    }
  }
  roots.forEach((root) => walk(root, 0))
  return rows
}

/** Raíz del árbol visible que contiene a `item`, o null si no está visible. */
export function findRootContaining(
  roots: TramiteTreeNode[],
  item: Pick<TramiteListItem, 'id' | 'kind'>
): TramiteTreeNode | null {
  const contains = (node: TramiteTreeNode): boolean =>
    (node.item.id === item.id && node.item.kind === item.kind) ||
    node.children.some(contains)
  return roots.find(contains) ?? null
}
