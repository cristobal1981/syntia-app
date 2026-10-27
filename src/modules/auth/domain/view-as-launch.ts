/**
 * «Despegue» de la vista como cliente: pantalla completa con Sappo en un cohete mientras se abre el
 * portal del cliente y, cuando está listo, el cohete sale propulsado. Esto es solo el estado: qué
 * fase toca y cuándo.
 *
 * - `waiting`: se pidió abrir la vista; el cohete espera en el centro.
 * - `launching`: el portal del cliente ya está pintado; el cohete despega y la pantalla se abre.
 */
export type ViewAsLaunchPhase = 'idle' | 'waiting' | 'launching'

export type ViewAsLaunchState = {
  phase: ViewAsLaunchPhase
  /** Cuándo empezó la espera (ms), para el mínimo de pantalla y el plazo máximo. */
  startedAt: number
  /** El portal del cliente ya está pintado. */
  ready: boolean
}

export const IDLE_VIEW_AS_LAUNCH: ViewAsLaunchState = { phase: 'idle', startedAt: 0, ready: false }

/** Lo mínimo que se ve el cohete esperando: con un portal que carga al instante no parpadea. */
export const VIEW_AS_LAUNCH_MIN_MS = 1100
/** Si el portal no llega a pintarse en este plazo se quita el cohete (algo falló). */
export const VIEW_AS_LAUNCH_MAX_MS = 12_000
/** Lo que dura el despegue antes de quitar la pantalla. */
export const VIEW_AS_LAUNCH_FLIGHT_MS = 950

export function startViewAsLaunch(now: number): ViewAsLaunchState {
  return { phase: 'waiting', startedAt: now, ready: false }
}

/** El portal del cliente ya se ha pintado. Solo cuenta si se está esperando. */
export function markViewAsReady(state: ViewAsLaunchState): ViewAsLaunchState {
  return state.phase === 'waiting' ? { ...state, ready: true } : state
}

/** ¿Toca despegar? Listo el portal y cumplido el mínimo de pantalla. */
export function shouldLaunch(state: ViewAsLaunchState, now: number): boolean {
  return state.phase === 'waiting' && state.ready && now - state.startedAt >= VIEW_AS_LAUNCH_MIN_MS
}

/** ¿Hay que rendirse? Pasó el plazo máximo sin que el portal llegara a pintarse. */
export function shouldGiveUp(state: ViewAsLaunchState, now: number): boolean {
  return state.phase === 'waiting' && !state.ready && now - state.startedAt >= VIEW_AS_LAUNCH_MAX_MS
}

export function launch(state: ViewAsLaunchState): ViewAsLaunchState {
  return state.phase === 'waiting' ? { ...state, phase: 'launching' } : state
}
