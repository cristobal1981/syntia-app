/**
 * «Despegue» de la vista como cliente: pantalla completa con Sappo en un cohete mientras se abre el
 * portal del cliente y, cuando está listo, el cohete sale propulsado. Esto es solo el estado: qué
 * fase toca y cuándo.
 *
 * - `waiting`: se pidió abrir la vista; el cohete espera en el centro.
 * - `launching`: el portal del cliente ya está pintado; el cohete despega y la pantalla se abre.
 *
 * Al salir de la vista se hace el camino inverso: Sappo baja en paracaídas.
 * - `returning`: se pidió salir; Sappo cae con el paracaídas mientras carga el panel del equipo.
 * - `landed`: el panel ya está pintado; Sappo aterriza, el paracaídas se pliega y la pantalla se abre.
 */
export type ViewAsLaunchPhase = 'idle' | 'waiting' | 'launching' | 'returning' | 'landed'

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

/** Lo mínimo que dura la caída: da tiempo a ver el paracaídas aunque el panel cargue al instante. */
export const VIEW_AS_RETURN_MIN_MS = 1700
/** Lo que dura el aterrizaje (paracaídas plegándose y fundido) antes de quitar la pantalla. */
export const VIEW_AS_LANDING_MS = 1300

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

/** ¿Hay que rendirse? Pasó el plazo máximo sin que la pantalla de destino llegara a pintarse. */
export function shouldGiveUp(state: ViewAsLaunchState, now: number): boolean {
  return (
    (state.phase === 'waiting' || state.phase === 'returning') &&
    !state.ready &&
    now - state.startedAt >= VIEW_AS_LAUNCH_MAX_MS
  )
}

export function startViewAsReturn(now: number): ViewAsLaunchState {
  return { phase: 'returning', startedAt: now, ready: false }
}

/** El panel del equipo ya está pintado. Solo cuenta si se está volviendo. */
export function markViewAsReturnArrived(state: ViewAsLaunchState): ViewAsLaunchState {
  return state.phase === 'returning' ? { ...state, ready: true } : state
}

/** ¿Toca aterrizar? Panel pintado y cumplido el mínimo de caída. */
export function shouldLand(state: ViewAsLaunchState, now: number): boolean {
  return state.phase === 'returning' && state.ready && now - state.startedAt >= VIEW_AS_RETURN_MIN_MS
}

export function land(state: ViewAsLaunchState): ViewAsLaunchState {
  return state.phase === 'returning' ? { ...state, phase: 'landed' } : state
}

export function launch(state: ViewAsLaunchState): ViewAsLaunchState {
  return state.phase === 'waiting' ? { ...state, phase: 'launching' } : state
}
