export const DEFERRED_POLL_MS = 2_000

export function shouldRefreshPortalPageOnNotificationPoll(pathname: string): boolean {
  // Guías: contenido estático; router.refresh() remonta loading.tsx y pierde scroll.
  if (pathname.startsWith('/guias')) return false
  return true
}

/**
 * Cuándo hace el primer sondeo la pestaña líder. Si el servidor ya sembró las
 * novedades (el inicio), repetir la misma carga a Odoo nada más hidratar es
 * trabajo doble: el primer sondeo espera al intervalo normal. Con `?open=` se
 * retrasa un poco para dejar abrir el drawer; en el resto de pantallas, ya.
 */
export function initialPollDelayMs(input: {
  seededFromServer: boolean
  /** La pantalla siembra las novedades por streaming y aún no ha llegado (el inicio). */
  serverWillSeed?: boolean
  deferForOpenParam: boolean
  intervalMs: number
}): number {
  if (input.seededFromServer) return input.intervalMs
  if (input.serverWillSeed) return SERVER_SEED_GRACE_MS
  return input.deferForOpenParam ? DEFERRED_POLL_MS : 0
}

/**
 * Margen del inicio para que lleguen las novedades por streaming antes de
 * sondear por su cuenta: si no llegan (la carga del servidor falló), el
 * sondeo las trae tras este margen y no a los 30 s.
 */
export const SERVER_SEED_GRACE_MS = 2_500

export function shouldDeferInitialPoll(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('open')
}

/**
 * ¿Hay que avisar al servidor de que el usuario ya vio los eventos hasta `signalSeq`? Solo con la
 * ventana a la vista (igual que el service worker, que no muestra el push con una ventana visible),
 * tras una comprobación completa de verdad (no con snapshots reutilizados, que pueden ir por detrás
 * de los eventos) y solo si hay algo más nuevo que lo último avisado.
 */
export function shouldAcknowledgeEventsSeen(input: {
  signalSeq: number | null
  lastAcknowledgedSeq: number | null
  windowVisible: boolean
  usedRecentSnapshots: boolean
}): boolean {
  if (input.signalSeq === null || input.signalSeq <= 0) return false
  if (!input.windowVisible || input.usedRecentSnapshots) return false
  return input.lastAcknowledgedSeq === null || input.signalSeq > input.lastAcknowledgedSeq
}

/**
 * Con la señal de eventos activa, un sondeo programado solo hace la
 * comprobación completa (Odoo) si hay eventos nuevos desde la última, si nunca
 * se ha hecho o si ya pasó `maxAgeMs`: esa red de seguridad cubre lo que no
 * llega por eventos (documentos nuevos, un evento perdido…).
 */
export function shouldRunFullNotificationsCheck(input: {
  signalSeq: number
  lastSignalSeq: number | null
  lastFullCheckAt: number | null
  now: number
  maxAgeMs: number
}): boolean {
  if (input.lastSignalSeq === null || input.lastFullCheckAt === null) return true
  if (input.signalSeq !== input.lastSignalSeq) return true
  return input.now - input.lastFullCheckAt >= input.maxAgeMs
}
