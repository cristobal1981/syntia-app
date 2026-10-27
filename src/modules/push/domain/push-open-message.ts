import { resolveSafeRedirectPath } from '@/lib/security/safe-redirect-path'

/** Tipo del mensaje con el que el service worker pide a la app abierta que abra una ruta. */
export const PUSH_OPEN_URL_MESSAGE_TYPE = 'syntia:open-url'

/**
 * Ruta interna que manda el service worker al pulsar una notificación con la app abierta, o `null`
 * si el mensaje no es de ese tipo o la ruta no es del propio sitio (nunca se navega a otro origen).
 */
export function parsePushOpenMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const { type, url } = data as { type?: unknown; url?: unknown }
  if (type !== PUSH_OPEN_URL_MESSAGE_TYPE || typeof url !== 'string') return null
  return resolveSafeRedirectPath(url, '') || null
}
