import webpush from 'web-push'

import type { PushPayload } from '@/src/modules/push/domain/push-dispatch'

/**
 * `gone`: la suscripción ya no existe. `rejected`: el servicio de push rechaza
 * la petición (400/401/403/413), que no mejora reintentando. `error`: fallo
 * pasado o transitorio (red, 429, 5xx).
 */
export type PushSendResult = 'ok' | 'gone' | 'rejected' | 'error'

const REJECTED_STATUSES = new Set([400, 401, 403, 413])

function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).host
  } catch {
    return 'invalid-endpoint'
  }
}

let configured = false

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim()
  )
}

function configure() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  )
  configured = true
}

/** `gone` = el servicio de push dice que la suscripción ya no existe (404/410). */
export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<PushSendResult> {
  configure()
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      // Un aviso que no se entrega en una hora deja de interesar.
      { TTL: 3600 }
    )
    return 'ok'
  } catch (error) {
    const { statusCode: status, body } = error as { statusCode?: number; body?: unknown }
    // Sin secretos: solo el estado, el host del servicio de push y el motivo.
    console.error('[push] envío falló', {
      status,
      host: hostOf(subscription.endpoint),
      reason: typeof body === 'string' ? body.slice(0, 200) : undefined,
    })
    if (status === 404 || status === 410) return 'gone'
    if (status !== undefined && REJECTED_STATUSES.has(status)) return 'rejected'
    return 'error'
  }
}
