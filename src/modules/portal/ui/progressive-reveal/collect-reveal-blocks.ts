export const SKELETON_SELECTOR = '[data-slot="skeleton"], [aria-busy="true"]'

const MAX_WRAPPER_DEPTH = 4

export type RevealDomProbe = {
  /** Si el elemento ocupa sitio en pantalla (no `display: none` ni vacío). */
  isVisible: (el: Element) => boolean
  /** Si sus hijos se colocan en fila (grid o flex en horizontal). */
  isRowLayout: (el: Element) => boolean
}

export const browserProbe: RevealDomProbe = {
  isVisible: (el) => {
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  },
  isRowLayout: (el) => {
    const style = getComputedStyle(el)
    if (style.display === 'grid' || style.display === 'inline-grid') return true
    return (
      (style.display === 'flex' || style.display === 'inline-flex') &&
      style.flexDirection.startsWith('row')
    )
  },
}

export function isSkeleton(el: Element): boolean {
  return el.matches(SKELETON_SELECTOR)
}

export function containsSkeleton(node: Node): boolean {
  return node instanceof Element && (isSkeleton(node) || node.querySelector(SKELETON_SELECTOR) !== null)
}

function visibleChildren(el: Element, probe: RevealDomProbe): Element[] {
  return Array.from(el.children).filter(
    (child) =>
      child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && probe.isVisible(child)
  )
}

/**
 * Trocea un árbol recién montado en bloques que entran por separado: atraviesa los envoltorios de
 * un solo hijo, toma los hijos como franjas (arriba→abajo) y, si una franja es una fila de
 * celdas (grid/flex), toma las celdas (izquierda→derecha). Lo que aún sea skeleton se salta.
 */
export function collectRevealBlocks(
  root: Element,
  probe: RevealDomProbe = browserProbe,
  depth = 0
): Element[] {
  if (isSkeleton(root)) return []
  if (!probe.isVisible(root)) return []

  const children = visibleChildren(root, probe)

  if (children.length === 0) return containsSkeleton(root) ? [] : [root]
  if (children.length === 1 && depth < MAX_WRAPPER_DEPTH) {
    return collectRevealBlocks(children[0], probe, depth + 1)
  }

  // Un contenedor que mezcla contenido real y skeletons se anima por partes, no entero.
  const strips = children.flatMap((child) => {
    if (isSkeleton(child)) return []
    if (containsSkeleton(child)) return collectRevealBlocks(child, probe, MAX_WRAPPER_DEPTH)
    const cells = visibleChildren(child, probe)
    if (cells.length >= 2 && probe.isRowLayout(child)) {
      return cells.filter((cell) => !containsSkeleton(cell))
    }
    return [child]
  })
  return strips
}

function normalizeText(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Texto real (no skeleton) que ya se veía en lo que se retira. Algunos `loading.tsx` pintan ya el
 * título o el saludo reales y la página los vuelve a montar idénticos: animarlos los haría
 * desaparecer y reaparecer (parpadeo), así que lo ya visible se deja quieto.
 */
export function collectSeenText(removed: Node[]): string {
  const texts: string[] = []
  const walk = (node: Node) => {
    if (!(node instanceof Element) || isSkeleton(node)) return
    if (!containsSkeleton(node)) {
      const text = normalizeText(node.textContent)
      if (text) texts.push(text)
      return
    }
    Array.from(node.children).forEach(walk)
  }
  removed.forEach(walk)
  return texts.join('\n')
}

const MIN_SEEN_TEXT_LENGTH = 2

export function wasAlreadyVisible(block: Element, seenText: string): boolean {
  const text = normalizeText(block.textContent)
  return text.length >= MIN_SEEN_TEXT_LENGTH && seenText.includes(text)
}
