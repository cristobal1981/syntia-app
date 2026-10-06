'use client'

import { useLayoutEffect, useState } from 'react'

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getPrefersReducedMotion)

  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    // El estado inicial (lazy initializer) se fija en el render SSR (window
    // indefinido → false) y la hidratación lo reutiliza tal cual; aquí se
    // corrige con el valor real de cliente antes de suscribirse a cambios.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
