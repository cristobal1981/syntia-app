import {
  getTramiteListItemKey,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'

export type TramitesListSeenState = {
  openItemKeys: string[]
  initialized: boolean
}

export function getOpenTramiteListItemKeys(items: TramiteListItem[]): string[] {
  return items.filter((item) => !item.isClosed).map(getTramiteListItemKey)
}

/** Solo trámites abiertos (las consultas las crea el cliente y no muestran «Nuevo»). */
export function getOpenTramiteOnlyListItemKeys(items: TramiteListItem[]): string[] {
  return items
    .filter((item) => item.kind === 'tramite' && !item.isClosed)
    .map(getTramiteListItemKey)
}

/** Claves de trámites abiertos que no estaban en la última visita. */
export function computeNewTramiteListItemKeys(
  items: TramiteListItem[],
  seen: TramitesListSeenState | null
): string[] {
  const openKeys = getOpenTramiteOnlyListItemKeys(items)

  if (!seen?.initialized) {
    return []
  }

  const known = new Set(seen.openItemKeys)
  return openKeys.filter((key) => !known.has(key))
}

export function isTramiteListItemNew(
  item: TramiteListItem,
  newItemKeys: readonly string[]
): boolean {
  return newItemKeys.includes(getTramiteListItemKey(item))
}
