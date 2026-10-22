/** Tiempo mínimo entre dos consultas de presencia al volver a la pestaña. */
export const PRESENCE_REFRESH_MIN_INTERVAL_MS = 30_000

/**
 * ¿Toca volver a pedir la presencia al recuperar la vista? Sí si nunca se ha
 * pedido o ya pasó el intervalo mínimo; así alternar entre pestañas no genera
 * una petición por cada cambio.
 */
export function shouldRefreshPresenceOnVisible(
  lastRefreshAt: number | null,
  now: number,
  minIntervalMs: number = PRESENCE_REFRESH_MIN_INTERVAL_MS
): boolean {
  if (lastRefreshAt === null) return true
  return now - lastRefreshAt >= minIntervalMs
}
