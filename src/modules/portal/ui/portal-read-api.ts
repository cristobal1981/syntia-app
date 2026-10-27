import type { PortalNewsSignalResult } from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import type { PortalNotificationsCheckResult } from '@/src/modules/portal/domain/portal-notifications-types'

/**
 * Lecturas del portal por HTTP (Route Handlers) en lugar de Server Actions: Next despacha las
 * acciones de un navegador de una en una, así que una lectura periódica hacía cola con el chat.
 * Un fallo de red rechaza con `TypeError` (lo trata `isNetworkFailure`, igual que antes); una
 * respuesta HTTP de error se traduce a un resultado `ok: false`.
 */
async function readJson<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  try {
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

export function fetchNewsSignal(): Promise<PortalNewsSignalResult> {
  return readJson<PortalNewsSignalResult>('/api/portal/news-signal', {
    ok: false,
    error: 'odoo_unavailable',
  })
}

/**
 * Comprobación completa de avisos. POST porque guarda estado («visto»). Una respuesta sin forma de
 * resultado (p. ej. el 403 del proxy bajo «vista como cliente», que es de solo lectura) se trata
 * como sin permiso, igual que antes con la acción.
 */
export async function fetchNotificationsCheck(options?: {
  reuseRecentSnapshots?: boolean
}): Promise<PortalNotificationsCheckResult> {
  const response = await fetch('/api/portal/notifications-check', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ reuseRecentSnapshots: options?.reuseRecentSnapshots === true }),
  })
  try {
    const body = (await response.json()) as PortalNotificationsCheckResult
    if (typeof (body as { ok?: unknown }).ok === 'boolean') return body
  } catch {
    // Sin cuerpo JSON: se trata abajo.
  }
  return { ok: false, error: response.status === 403 ? 'forbidden' : 'odoo_unavailable' }
}
