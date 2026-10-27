import type { PortalNewsSignalResult } from '@/src/modules/portal/application/portal-chatter-notifications-actions'

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
