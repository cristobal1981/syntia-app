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
  deferForOpenParam: boolean
  intervalMs: number
}): number {
  if (input.seededFromServer) return input.intervalMs
  return input.deferForOpenParam ? DEFERRED_POLL_MS : 0
}

export function shouldDeferInitialPoll(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('open')
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
