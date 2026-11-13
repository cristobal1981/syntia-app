'use client'

import { useEffect } from 'react'

import {
  collectRevealBlocks,
  collectSeenText,
  containsSkeleton,
  wasAlreadyVisible,
} from '@/src/modules/portal/ui/progressive-reveal/collect-reveal-blocks'
import { computeRevealDelay } from '@/src/modules/portal/ui/progressive-reveal/reveal-delay'

const DURATION_MS = 460
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const OFFSET_PX = 10
const MAX_BLOCKS = 48

function topMostElements(nodes: Node[]): Element[] {
  const elements = nodes.filter((node): node is Element => node instanceof Element)
  return elements.filter(
    (el) => !elements.some((other) => other !== el && other.contains(el))
  )
}

function canAnimate(el: Element): boolean {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false
  if (el.style.opacity !== '' || el.style.transform !== '') return false
  const position = getComputedStyle(el).position
  return position !== 'fixed' && position !== 'sticky'
}

function reveal(blocks: Element[]) {
  const viewportHeight = window.innerHeight
  for (const block of blocks.slice(0, MAX_BLOCKS)) {
    if (!canAnimate(block)) continue
    const rect = block.getBoundingClientRect()
    // Lo que queda fuera de pantalla ya entra visible: animarlo solo estiraría el scroll.
    if (rect.top > viewportHeight) continue
    block.animate(
      [
        { opacity: 0, transform: `translateY(${OFFSET_PX}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: DURATION_MS,
        delay: computeRevealDelay(rect.top, rect.left),
        easing: EASING,
        fill: 'backwards',
      }
    )
  }
}

/**
 * Carga progresiva tras el skeleton: cuando un lote de cambios del DOM quita un skeleton y mete
 * contenido real (ruta, Suspense, drawer, carga de cliente), ese contenido entra por bloques,
 * de arriba abajo y de izquierda a derecha. El observador corre antes de pintar, así que no hay
 * parpadeo. Los refrescos que no pasan por un skeleton no se animan. No renderiza nada.
 */
export function ProgressiveReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (typeof Element.prototype.animate !== 'function') return

    const observer = new MutationObserver((records) => {
      if (reducedMotion.matches) return

      const removed = records.flatMap((record) => Array.from(record.removedNodes))
      if (!removed.some(containsSkeleton)) return

      const added = topMostElements(
        records.flatMap((record) => Array.from(record.addedNodes))
      )
      if (added.length === 0) return

      const seenText = collectSeenText(removed)
      const blocks = added
        .flatMap((el) => collectRevealBlocks(el))
        .filter((block) => !wasAlreadyVisible(block, seenText))
      if (blocks.length > 0) reveal(blocks)
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
