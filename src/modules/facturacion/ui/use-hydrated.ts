import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * `false` en el servidor y en el primer pintado del cliente, `true` después. Los datos de la
 * facturación viven en el navegador: hasta entonces solo existen los de ejemplo, y mostrarlos
 * un instante antes de los reales parecería que los datos guardados se han perdido.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
