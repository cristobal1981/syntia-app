export const TRAMITES_LIST_ITEM_SEEN_EVENT = 'syntia:tramites-list-item-seen'

export type TramitesListItemSeenEventDetail = {
  key: string
}

export function dispatchTramitesListItemSeen(key: string): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent<TramitesListItemSeenEventDetail>(
      TRAMITES_LIST_ITEM_SEEN_EVENT,
      { detail: { key } }
    )
  )
}
