import { useSyncExternalStore } from 'react'

import {
  IDLE_VIEW_AS_LAUNCH,
  launch,
  markViewAsReady,
  startViewAsLaunch,
  type ViewAsLaunchState,
} from '@/src/modules/auth/domain/view-as-launch'

/**
 * Estado compartido del despegue. Vive fuera de React porque el botón que lo inicia (en el panel
 * del equipo) desaparece al navegar al portal del cliente, y la pantalla del cohete tiene que
 * sobrevivir a esa navegación.
 */
let state: ViewAsLaunchState = IDLE_VIEW_AS_LAUNCH
const listeners = new Set<() => void>()

function set(next: ViewAsLaunchState) {
  if (next === state) return
  state = next
  listeners.forEach((listener) => listener())
}

export function beginViewAsLaunch() {
  set(startViewAsLaunch(Date.now()))
}

/** El portal del cliente ya está pintado (lo avisa el banner de «vista como cliente»). */
export function reportViewAsReady() {
  set(markViewAsReady(state))
}

export function takeOffViewAsLaunch() {
  set(launch(state))
}

export function endViewAsLaunch() {
  set(IDLE_VIEW_AS_LAUNCH)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useViewAsLaunchState(): ViewAsLaunchState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE_VIEW_AS_LAUNCH
  )
}
