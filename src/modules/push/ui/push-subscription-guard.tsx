'use client'

import { useEffect } from 'react'

import { runWhenIdle } from '@/lib/run-when-idle'
import { dropForeignPushSubscription } from '@/src/modules/push/ui/push-device'

/** Sin interfaz: evita que un navegador reciba los avisos del usuario anterior. */
export function PushSubscriptionGuard() {
  useEffect(() => {
    // No hace falta para pintar y va en la cola de Server Actions: se deja para cuando haya calma.
    return runWhenIdle(() => {
      void dropForeignPushSubscription()
    })
  }, [])

  return null
}
