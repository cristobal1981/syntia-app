import { resolvePushSource } from '@/src/modules/push/domain/push-source'

/**
 * Interruptor del envío disparado desde el webhook: `PUSH_FROM_WEBHOOK=1` y `PUSH_SOURCE=events`.
 * Apagado, el único camino es el pulso de pg_cron.
 */
export function isPushFromWebhookEnabled(env: {
  PUSH_FROM_WEBHOOK?: string
  PUSH_SOURCE?: string
}): boolean {
  return env.PUSH_FROM_WEBHOOK?.trim() === '1' && resolvePushSource(env.PUSH_SOURCE) === 'events'
}
