'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  acknowledgeTramiteListItemSeenAction,
  acknowledgeTramitesListSeenAction,
} from '@/src/modules/tramites/application/tramites-list-seen-actions'
import {
  getTramiteListItemKey,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  getOpenTramiteListItemKeys,
  getOpenTramiteOnlyListItemKeys,
  type TramitesListSeenState,
} from '@/src/modules/tramites/domain/tramites-list-seen-state'
import {
  TRAMITES_LIST_ITEM_SEEN_EVENT,
  dispatchTramitesListItemSeen,
  type TramitesListItemSeenEventDetail,
} from '@/src/modules/tramites/domain/tramites-list-seen-events'

/**
 * Baseline de abiertos al entrar en /tramites (desde Supabase o primera visita).
 * Cualquier abierto nuevo respecto a ese baseline muestra icono «Nuevo» en la sesión.
 */
export function useTramitesListNewKeys(
  allItems: TramiteListItem[],
  seenState: TramitesListSeenState | null
) {
  const baselineRef = useRef<Set<string> | null>(null)
  const allItemsRef = useRef(allItems)
  const [revision, setRevision] = useState(0)

  allItemsRef.current = allItems

  useEffect(() => {
    if (baselineRef.current !== null) return

    if (seenState?.initialized) {
      baselineRef.current = new Set(seenState.openItemKeys)
    } else {
      const keys = getOpenTramiteListItemKeys(allItems)
      baselineRef.current = new Set(keys)
      void acknowledgeTramitesListSeenAction(keys)
    }

    setRevision((value) => value + 1)
  }, [allItems, seenState])

  useEffect(() => {
    function handleItemSeen(event: Event) {
      const baseline = baselineRef.current
      if (!baseline) return

      const key = (event as CustomEvent<TramitesListItemSeenEventDetail>).detail
        ?.key
      if (!key || baseline.has(key)) return

      baseline.add(key)
      setRevision((value) => value + 1)
    }

    window.addEventListener(TRAMITES_LIST_ITEM_SEEN_EVENT, handleItemSeen)
    return () => {
      window.removeEventListener(TRAMITES_LIST_ITEM_SEEN_EVENT, handleItemSeen)
    }
  }, [])

  useEffect(() => {
    return () => {
      const baseline = baselineRef.current
      if (!baseline) return

      void acknowledgeTramitesListSeenAction([...baseline])
    }
  }, [])

  const markItemSeen = useCallback((item: TramiteListItem) => {
    const baseline = baselineRef.current
    if (!baseline) return

    const key = getTramiteListItemKey(item)
    if (baseline.has(key)) return

    baseline.add(key)
    void acknowledgeTramiteListItemSeenAction(key)
    dispatchTramitesListItemSeen(key)
    setRevision((value) => value + 1)
  }, [])

  const newItemKeys = useMemo(() => {
    const baseline = baselineRef.current
    if (!baseline) return []

    return getOpenTramiteOnlyListItemKeys(allItems).filter(
      (key) => !baseline.has(key)
    )
  }, [allItems, revision])

  return { newItemKeys, markItemSeen }
}
