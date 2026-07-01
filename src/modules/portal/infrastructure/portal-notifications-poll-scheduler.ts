import {
  getChatterNotificationsPollIntervalMs,
  getChatterNotificationsPollMaxIntervalMs,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'

const POLL_INTERVAL_STEPS_MS = [
  30_000, 45_000, 60_000, 90_000, 120_000, 180_000, 240_000, 300_000,
] as const

export function getInitialPollIntervalMs(): number {
  return getChatterNotificationsPollIntervalMs()
}

export function getMaxPollIntervalMs(): number {
  return getChatterNotificationsPollMaxIntervalMs()
}

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
