import { revalidateTag } from 'next/cache'

import {
  chatterUnreadBatchCacheTag,
  forgetRecentTramitesLoad,
  getCachedObligacionNotificationSnapshotSafe,
  getCachedPendingSignaturesSnapshotSafe,
  getCachedTramitesSnapshotSafe,
  obligacionNotificationSnapshotCacheTag,
  obligacionTaskIndexCacheTag,
  obligacionTreeCacheTag,
  pendingSignaturesSnapshotCacheTag,
  tramitesSnapshotCacheTag,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

export type CacheEvent = {
  kind:
    | 'message'
    | 'status'
    | 'new_record'
    | 'new_firma'
    | 'firma_due_soon'
    | 'assignee_change'
  scope: 'tramite' | 'consulta' | 'obligacion' | 'firma'
  partnerId: number
}

/**
 * Qué cachés de ese cliente deja viejas un evento de Odoo. Así los snapshots se
 * renuevan en cuanto algo cambia y la caducidad de 90 s queda solo como red de
 * seguridad para lo que no llega por eventos.
 */
export function portalCacheTagsForEvent(event: CacheEvent): string[] {
  const partnerId = event.partnerId
  switch (event.kind) {
    case 'message':
      return [chatterUnreadBatchCacheTag(partnerId)]
    case 'status':
      return event.scope === 'obligacion'
        ? [
            obligacionTaskIndexCacheTag(partnerId),
            obligacionNotificationSnapshotCacheTag(partnerId),
            obligacionTreeCacheTag(partnerId),
          ]
        : [tramitesSnapshotCacheTag(partnerId)]
    case 'new_record':
    case 'assignee_change':
      return [tramitesSnapshotCacheTag(partnerId)]
    case 'new_firma':
      return [pendingSignaturesSnapshotCacheTag(partnerId)]
    case 'firma_due_soon':
      // Es por fecha: no cambia ningún snapshot.
      return []
  }
}

/** Caduca al instante las cachés afectadas; un fallo se registra y no tumba el evento ya guardado. */
export function invalidatePortalCachesForEvent(event: CacheEvent): void {
  try {
    forgetRecentTramitesLoad(event.partnerId)
    for (const tag of portalCacheTagsForEvent(event)) {
      revalidateTag(tag, { expire: 0 })
    }
  } catch (error) {
    console.error('[portal cache] invalidar falló', { kind: event.kind, error })
  }
}

type WarmableSnapshot = 'tramites' | 'obligaciones' | 'firmas'

/**
 * Qué snapshots conviene dejar calientes tras un evento: los que ese mismo evento dejó caducados
 * y que la siguiente visita del cliente pagaría en frío (8-13 peticiones seguidas a Odoo). Un
 * mensaje no calienta nada: el chatter se lee en fresco en cada comprobación.
 */
export function portalSnapshotsToWarmForEvent(event: CacheEvent): WarmableSnapshot[] {
  switch (event.kind) {
    case 'message':
    case 'firma_due_soon':
      return []
    case 'status':
      return [event.scope === 'obligacion' ? 'obligaciones' : 'tramites']
    case 'new_record':
    case 'assignee_change':
      return ['tramites']
    case 'new_firma':
      return ['firmas']
  }
}

const warmLoaders: Record<WarmableSnapshot, (partnerId: number) => Promise<unknown>> = {
  tramites: getCachedTramitesSnapshotSafe,
  obligaciones: getCachedObligacionNotificationSnapshotSafe,
  firmas: getCachedPendingSignaturesSnapshotSafe,
}

/** Calentamientos en marcha en este proceso: una ráfaga de eventos del mismo cliente comparte la lectura. */
const warming = new Map<string, Promise<unknown>>()

/**
 * Lee ya los snapshots que el evento dejó caducados, para que la caché compartida quede al día y la
 * próxima visita del cliente (o de un colaborador) no espere a Odoo. Se llama unos segundos después
 * del evento, no al recibirlo: el webhook de Odoo puede llegar antes de que su cambio esté guardado
 * y se cachearía el estado viejo. Nunca lanza: es una optimización.
 */
export async function warmPortalCachesForEvent(event: CacheEvent): Promise<void> {
  try {
    await Promise.all(
      portalSnapshotsToWarmForEvent(event).map((name) => {
        const key = `${name}:${event.partnerId}`
        const inFlight = warming.get(key)
        if (inFlight) return inFlight
        const load = warmLoaders[name](event.partnerId).finally(() => warming.delete(key))
        warming.set(key, load)
        return load
      })
    )
  } catch (error) {
    console.error('[portal cache] calentar falló', { kind: event.kind, error })
  }
}
