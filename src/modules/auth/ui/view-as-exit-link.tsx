'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'

import {
  beginViewAsReturn,
  endViewAsLaunch,
} from '@/src/modules/auth/ui/view-as-launch-store'

/**
 * Enlace de «Salir de la vista». Sin JavaScript (o con clic medio o con teclas) sigue siendo el
 * enlace normal a `/api/view-as/exit`. Con un clic normal quita la vista por `fetch` y navega sin
 * recargar, para que Sappo aterrice en paracaídas sobre el panel del equipo.
 */
export function ViewAsExitLink({
  className,
  ariaLabel,
  children,
}: {
  className?: string
  ariaLabel: string
  children: ReactNode
}) {
  const router = useRouter()

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    beginViewAsReturn()
    try {
      const response = await fetch('/api/view-as/exit?format=json', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const body = (await response.json()) as { target?: unknown }
      if (!response.ok || typeof body.target !== 'string' || !body.target.startsWith('/')) {
        throw new Error('exit_failed')
      }
      router.push(body.target)
      router.refresh()
    } catch {
      endViewAsLaunch()
      // Es una ruta de API (no una página de Next): hace falta la navegación completa.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/api/view-as/exit'
    }
  }

  return (
    <a href="/api/view-as/exit" aria-label={ariaLabel} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}
