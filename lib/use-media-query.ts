'use client'

import { useSyncExternalStore } from 'react'

/** `false` en el servidor y en la hidratación; se corrige en cuanto el cliente conoce el valor. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
