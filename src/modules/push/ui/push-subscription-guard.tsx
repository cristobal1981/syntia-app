'use client'

import { useEffect } from 'react'

import { runWhenIdle } from '@/lib/run-when-idle'
import { syncThisDevicePush } from '@/src/modules/push/ui/push-device'

/**
 * Sin interfaz: mantiene la suscripción de este navegador al día con el servidor y evita que
 * reciba los avisos del usuario anterior.
 */
export function PushSubscriptionGuard() {
  useEffect(() => {
    // No hace falta para pintar y va en la cola de Server Actions: se deja para cuando haya calma.
    return runWhenIdle(() => {
      void syncThisDevicePush()
    })
  }, [])

  return null
}
