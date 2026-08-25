'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getOpenTramiteListItemKeys } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

async function resolveTramitesListSeenActorId(): Promise<string | null> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return null
  }

  if (session.user.role === 'worker') {
    const allowed = await getAllowedSectionsForWorker(session.user)
    if (!allowed.has('/tramites')) {
      return null
    }
  }

  return resolveDirectoryActorId(session.user)
}

export async function acknowledgeTramitesListSeenAction(
  openItemKeys: string[]
): Promise<void> {
  const actorId = await resolveTramitesListSeenActorId()
  if (!actorId) {
    return
  }

  const uniqueKeys = [...new Set(openItemKeys)]

  try {
    await upsertTramitesListSeenState(actorId, uniqueKeys)
  } catch {
    // Sin tabla aún o error transitorio: no bloquear navegación.
  }
}

export async function acknowledgeTramiteListItemSeenAction(
  itemKey: string
): Promise<void> {
  const actorId = await resolveTramitesListSeenActorId()
  if (!actorId) {
    return
  }

  try {
    const seen = await fetchTramitesListSeenState(actorId)
    const keys = new Set(seen?.openItemKeys ?? [])
    keys.add(itemKey)
    await upsertTramitesListSeenState(actorId, [...keys])
  } catch {
    // Sin tabla aún o error transitorio: no bloquear navegación.
  }
}

export async function acknowledgeTramitesListSeenFromItemsAction(
  items: TramiteListItem[]
): Promise<void> {
  await acknowledgeTramitesListSeenAction(getOpenTramiteListItemKeys(items))
}
