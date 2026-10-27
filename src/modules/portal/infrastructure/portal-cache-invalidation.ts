import { revalidateTag } from 'next/cache'

import {
  chatterUnreadBatchCacheTag,
  forgetRecentTramitesLoad,
  obligacionNotificationSnapshotCacheTag,
  obligacionTaskIndexCacheTag,
  obligacionTreeCacheTag,
  pendingSignaturesSnapshotCacheTag,
  tramitesSnapshotCacheTag,
} from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

type CacheEvent = {
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
