'use client'

import { useSyncExternalStore } from 'react'

import {
  createConnectivityStore,
  type ConnectivityStore,
} from '@/src/modules/portal/domain/portal-connectivity'

export const portalConnectivityStore: ConnectivityStore = createConnectivityStore({
  isOnline: () => typeof navigator === 'undefined' || navigator.onLine,
  subscribe(onChange) {
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
    return () => {
      window.removeEventListener('online', onChange)
      window.removeEventListener('offline', onChange)
    }
  },
})

/** `true` mientras el portal no tiene salida a internet. */
export function usePortalOffline(): boolean {
  return useSyncExternalStore(
    portalConnectivityStore.subscribe,
    portalConnectivityStore.getSnapshot,
    () => false
  )
}
