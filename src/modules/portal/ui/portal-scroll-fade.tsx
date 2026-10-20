'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import { getScrollEdges, type ScrollEdges } from '@/src/modules/portal/lib/scroll-edges'

type PortalScrollFadeProps = {
  id?: string
  ariaLabel: string
  /** Clases de la caja exterior (alto y posición). */
  className?: string
  /** Clases de la zona que hace scroll (relleno, color de fondo). */
  scrollClassName?: string
  /** Clases del contenido (disposición de los elementos). */
  contentClassName?: string
  children: ReactNode
}

const EDGE_BASE =
  'pointer-events-none absolute inset-x-0 z-10 flex h-10 justify-center transition-opacity duration-200 motion-reduce:transition-none'

/**
 * Zona con scroll sin barra visible: cuando queda contenido oculto, un borde
 * oscurecido con un caret avisa por ese lado (arriba y abajo). El caret solo es
 * un atajo de ratón: con teclado se desplaza con las flechas, así que no entra en el foco.
 */
export function PortalScrollFade({
  id,
  ariaLabel,
  className,
  scrollClassName,
  contentClassName,
  children,
}: PortalScrollFadeProps) {
  const scrollRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [edges, setEdges] = useState<ScrollEdges>({ top: false, bottom: false })

  const update = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const next = getScrollEdges(element)
    setEdges((current) => (current.top === next.top && current.bottom === next.bottom ? current : next))
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    const content = contentRef.current
    if (!element || !content) return

    update()
    // El contenido cambia de alto al abrir o cerrar un grupo (animado): se observa el
    // contenido, no solo la caja, para que los bordes sigan al desplegable fotograma a fotograma.
    const observer = new ResizeObserver(update)
    observer.observe(element)
    observer.observe(content)
    return () => observer.disconnect()
  }, [update])

  const scrollByPage = (direction: 1 | -1) => {
    const element = scrollRef.current
    if (!element) return
    element.scrollBy({
      top: direction * element.clientHeight * 0.75,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const caretClass =
    'pointer-events-auto mt-0.5 flex h-5 w-8 cursor-pointer items-center justify-center rounded-full text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground'

  return (
    <div className={cn('relative min-h-0', className)}>
      <nav
        id={id}
        ref={scrollRef}
        aria-label={ariaLabel}
        onScroll={update}
        className={cn('scrollbar-hidden h-full overflow-y-auto', scrollClassName)}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </nav>

      <div
        aria-hidden
        className={cn(
          EDGE_BASE,
          'top-0 items-start bg-gradient-to-b from-black/40 to-transparent',
          edges.top ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button type="button" tabIndex={-1} className={caretClass} onClick={() => scrollByPage(-1)}>
          <ChevronUp className="size-4" />
        </button>
      </div>
      <div
        aria-hidden
        className={cn(
          EDGE_BASE,
          'bottom-0 items-end bg-gradient-to-t from-black/40 to-transparent',
          edges.bottom ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button type="button" tabIndex={-1} className={cn(caretClass, 'mb-0.5')} onClick={() => scrollByPage(1)}>
          <ChevronDown className="size-4" />
        </button>
      </div>
    </div>
  )
}
