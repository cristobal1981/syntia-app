'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { TramitesListSeenState } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  computeNewTramiteListItemKeys,
  getOpenTramiteListItemKeys,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  mergeTramitesList,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import type { TramitesSnapshot } from '@/src/modules/tramites/domain/types'
import {
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

async function resolveTramitesListSeenActorId(): Promise<string | null> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return null
  }

  return resolveDirectoryActorId(session.user)
}

export async function resolveNewTramiteListItemKeys(
  actorId: string,
  items: TramiteListItem[]
): Promise<string[]> {
  try {
    const seen = await fetchTramitesListSeenState(actorId)
    return computeNewTramiteListItemKeys(items, seen)
  } catch {
    return []
  }
}

export async function resolveNewTramiteListItemKeysFromSnapshot(
  actorId: string,
  snapshot: TramitesSnapshot
): Promise<string[]> {
  const items = mergeTramitesList(snapshot.tasks, snapshot.tickets)
  return resolveNewTramiteListItemKeys(actorId, items)
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

export async function acknowledgeTramitesListSeenFromItemsAction(
  items: TramiteListItem[]
): Promise<void> {
  await acknowledgeTramitesListSeenAction(getOpenTramiteListItemKeys(items))
}
