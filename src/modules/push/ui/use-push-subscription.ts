'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  getPushPreferencesAction,
  subscribePushAction,
  unsubscribePushAction,
  updatePushPreferencesAction,
} from '@/src/modules/push/application/push-subscription-actions'
import {
  detectPushSupport,
  urlBase64ToUint8Array,
  type PushSupport,
} from '@/src/modules/push/domain/push-support'
import type { PushPreferences } from '@/src/modules/push/domain/push-subscription'

export type PushUiState =
  | { kind: 'loading' }
  | { kind: 'unsupported'; support: Exclude<PushSupport, 'supported'> }
  | { kind: 'denied' }
  | { kind: 'off' }
  | { kind: 'on'; endpoint: string; preferences: PushPreferences }

export type PushActionError = 'denied' | 'rate_limited' | 'generic'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()

export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY)

function readSupport(): PushSupport {
  const ua = navigator.userAgent
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return detectPushSupport({
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    isIos,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
  })
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

/**
 * Estado y acciones de las notificaciones push de ESTE dispositivo. La
 * suscripción vive en el navegador (pushManager); el servidor guarda la copia
 * con las preferencias por tipo.
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushUiState>({ kind: 'loading' })
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const support = readSupport()
      if (support !== 'supported') {
        return { kind: 'unsupported', support } as const
      }

      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) {
        return Notification.permission === 'denied'
          ? ({ kind: 'denied' } as const)
          : ({ kind: 'off' } as const)
      }

      const result = await getPushPreferencesAction(subscription.endpoint)
      if (result.ok) {
        return {
          kind: 'on',
          endpoint: subscription.endpoint,
          preferences: result.preferences,
        } as const
      }
      return { kind: 'off' } as const
    }

    void load()
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'off' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async (): Promise<PushActionError | null> => {
    if (!VAPID_PUBLIC_KEY) return 'generic'
    setPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState({ kind: permission === 'denied' ? 'denied' : 'off' })
        return 'denied'
      }

      const registration = await getRegistration()
      // Siempre una suscripción nueva: una anterior puede haberse creado con
      // otra clave VAPID (o estar caducada) y el servicio de push la rechazaría.
      await (await registration.pushManager.getSubscription())?.unsubscribe()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()
      const result = await subscribePushAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent,
      })
      if (!result.ok) {
        await subscription.unsubscribe()
        return result.error === 'rate_limited' ? 'rate_limited' : 'generic'
      }

      setState({
        kind: 'on',
        endpoint: subscription.endpoint,
        preferences: result.preferences,
      })
      return null
    } catch {
      return 'generic'
    } finally {
      setPending(false)
    }
  }, [])

  const disable = useCallback(async (): Promise<PushActionError | null> => {
    if (state.kind !== 'on') return null
    setPending(true)
    try {
      const result = await unsubscribePushAction(state.endpoint)
      if (!result.ok) return 'generic'

      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      await (await registration?.pushManager.getSubscription())?.unsubscribe()
      setState({ kind: 'off' })
      return null
    } catch {
      return 'generic'
    } finally {
      setPending(false)
    }
  }, [state])

  const setPreferences = useCallback(
    async (preferences: PushPreferences): Promise<PushActionError | null> => {
      if (state.kind !== 'on') return null
      const previous = state
      setState({ ...state, preferences })
      const result = await updatePushPreferencesAction(state.endpoint, preferences)
      if (!result.ok) {
        setState(previous)
        return 'generic'
      }
      return null
    },
    [state]
  )

  return { state, pending, enable, disable, setPreferences }
}
