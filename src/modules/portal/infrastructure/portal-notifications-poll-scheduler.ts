import {
  getChatterNotificationsPollIntervalMs,
  getChatterNotificationsPollMaxIntervalMs,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'

const POLL_INTERVAL_STEPS_MS = [
  30_000, 45_000, 60_000, 90_000, 120_000, 180_000, 240_000, 300_000,
] as const

/**
 * Cada cuánto pregunta a Supabase si hay eventos nuevos (la señal): una consulta barata, sin tocar
 * Odoo. Mucho más corto que el sondeo completo, que solo se lanza cuando cambia algo. Es una
 * constante y no una variable de entorno porque este código corre en el navegador, que no ve las
 * variables sin `NEXT_PUBLIC_`: con una variable el intervalo se quedaba en el valor por defecto.
 */
export const SIGNAL_POLL_INTERVAL_MS = 10_000

export function getInitialPollIntervalMs(): number {
  return getChatterNotificationsPollIntervalMs()
}

export function getMaxPollIntervalMs(): number {
  return getChatterNotificationsPollMaxIntervalMs()
}

/**
 * Backoff del sondeo: con cambios vuelve al intervalo base; sin ellos sube
 * un escalón de POLL_INTERVAL_STEPS_MS sin pasar del máximo configurado.
 */
export function nextPollIntervalMs(
  currentMs: number,
  hadChanges: boolean
): number {
  const baseMs = getInitialPollIntervalMs()
  const maxMs = getMaxPollIntervalMs()

  if (hadChanges) {
    return baseMs
  }

  const steps = POLL_INTERVAL_STEPS_MS.filter(
    (step) => step >= baseMs && step <= maxMs
  )
  if (!steps.length) {
    return maxMs
  }

  const currentIndex = steps.findIndex((step) => step >= currentMs)
  const index =
    currentIndex === -1
      ? 0
      : Math.min(currentIndex + 1, steps.length - 1)

  return Math.min(steps[index] ?? maxMs, maxMs)
}

export function notificationsSignature(
  items: Array<{ scope: string; recordId: number; reason: string }>
): string {
  return items
    .map((item) => `${item.scope}:${item.recordId}:${item.reason}`)
    .sort()
    .join('|')
}
