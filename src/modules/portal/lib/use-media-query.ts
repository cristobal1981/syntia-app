'use client'

import { useSyncExternalStore } from 'react'

/** Cortes de la barra lateral; deben coincidir con `md` (768 px) y `xl` (1280 px) de Tailwind. */
export const SIDEBAR_OVERLAY_QUERY = '(min-width: 768px) and (max-width: 959.98px)'
export const SIDEBAR_BELOW_XL_QUERY = '(max-width: 1279.98px)'

/** `false` en el servidor y en la hidratación; se corrige en cuanto el cliente conoce el ancho. */
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
