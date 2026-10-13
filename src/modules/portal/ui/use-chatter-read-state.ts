import { useCallback, useEffect, useRef } from 'react'

import type { ChatterReadStateMap } from '@/src/modules/portal/domain/portal-notifications-types'
import { chatterReadStateKey } from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  CHATTER_READ_STATE_STORAGE_KEY,
  loadReadStateFromStorage,
  mergeReadState,
  saveReadStateToStorage,
} from '@/src/modules/portal/infrastructure/portal-chatter-read-state-storage'

/**
 * Posesión exclusiva de `readState` (qué mensaje de chatter ha visto ya el
 * usuario, por registro) — persistido en localStorage y sincronizado entre
 * pestañas vía el evento `storage` nativo (no el `BroadcastChannel` del
 * coordinador de notificaciones, que es un sistema aparte).
 */
export function useChatterReadState(enabled: boolean) {
  const readStateRef = useRef<ChatterReadStateMap>({})

  const applyReadState = useCallback((readState: ChatterReadStateMap) => {
    readStateRef.current = mergeReadState(readStateRef.current, readState)
    saveReadStateToStorage(readStateRef.current)
  }, [])

  /** Para `initializeNotifications` (hidratación SSR): fusiona lo persistido con lo que trae el servidor. */
  const hydrateFromStorage = useCallback((serverReadState: ChatterReadStateMap) => {
    readStateRef.current = mergeReadState(loadReadStateFromStorage(), serverReadState)
    saveReadStateToStorage(readStateRef.current)
  }, [])

  /** Para el arranque del polling (sin datos SSR que fusionar). */
  const loadFromStorage = useCallback(() => {
    readStateRef.current = loadReadStateFromStorage()
  }, [])

  /**
   * Id del último mensaje ya visto ANTES de la lectura actual, para pintar
   * un separador "mensajes nuevos" en el chat. Lee el ref directamente (no
   * un estado derivado) para poder llamarse desde un `useMemo` en el
   * consumidor y capturar el valor justo antes de que el ack de apertura
   * lo sobrescriba — el mismo truco que ya usa `chatterNotification` en
   * tramite-detail-drawer.tsx.
   */
  const getLastSeenMessageId = useCallback(
    (recordKind: PortalRecordKind, recordId: number) =>
      readStateRef.current[chatterReadStateKey(recordKind, recordId)] ?? 0,
    []
  )

  useEffect(() => {
    if (!enabled) return

    function handleStorageSync(event: StorageEvent) {
      if (event.key !== CHATTER_READ_STATE_STORAGE_KEY || !event.newValue) return
      try {
        const parsed = JSON.parse(event.newValue) as ChatterReadStateMap
        if (!parsed || typeof parsed !== 'object') return
        readStateRef.current = mergeReadState(readStateRef.current, parsed)
      } catch {
        // ignore invalid payload
      }
    }

    window.addEventListener('storage', handleStorageSync)
    return () => window.removeEventListener('storage', handleStorageSync)
  }, [enabled])

  return { readStateRef, applyReadState, hydrateFromStorage, loadFromStorage, getLastSeenMessageId }
}
