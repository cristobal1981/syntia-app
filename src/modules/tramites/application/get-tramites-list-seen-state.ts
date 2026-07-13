import type { TramitesListSeenState } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import { fetchTramitesListSeenState } from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

export async function getTramitesListSeenStateForUser(
  actorId: string
): Promise<TramitesListSeenState | null> {
  try {
    return await fetchTramitesListSeenState(actorId)
  } catch {
    return null
  }
}
