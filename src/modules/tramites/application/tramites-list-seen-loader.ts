import type { TramitesListSeenState } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

/**
 * Deliberadamente NO es `'use server'`: `actorId` viene tal cual del
 * llamante, sin derivarlo de la sesión — solo es seguro porque hoy el único
 * llamante (`loadClientPortalNotifications`) ya lo resuelve a partir de la
 * sesión antes de llegar aquí. Si esto viviera en un archivo `'use server'`,
 * sería una Server Action invocable directamente con cualquier `actorId`
 * desde el cliente, sin comprobar que pertenece a quien hace la llamada.
 */
export async function ensureTramitesListSeenInitialized(
  actorId: string,
  openItemKeys: string[]
): Promise<TramitesListSeenState> {
  const seen = await fetchTramitesListSeenState(actorId)
  if (seen?.initialized) {
    return seen
  }

  const keys = [...new Set(openItemKeys)]
  await upsertTramitesListSeenState(actorId, keys)
  return { openItemKeys: keys, initialized: true }
}
