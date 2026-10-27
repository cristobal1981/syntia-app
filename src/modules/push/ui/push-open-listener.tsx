'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { parsePushOpenMessage } from '@/src/modules/push/domain/push-open-message'

/**
 * Sin interfaz: al pulsar una notificación con la app ya abierta, el service worker manda aquí la
 * ruta y se navega por dentro, sin recargar la página (se conservan las conversaciones y los avisos
 * en memoria). Confirma por el puerto que recibe; sin confirmación el service worker recarga.
 */
export function PushOpenListener() {
  const router = useRouter()

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const container = navigator.serviceWorker
    function handleMessage(event: MessageEvent) {
      const url = parsePushOpenMessage(event.data)
      if (!url) return
      router.push(url)
      event.ports[0]?.postMessage('ok')
    }

    container.addEventListener('message', handleMessage)
    return () => container.removeEventListener('message', handleMessage)
  }, [router])

  return null
}
