'use client'

import { useEffect } from 'react'

import { dropForeignPushSubscription } from '@/src/modules/push/ui/push-device'

/** Sin interfaz: evita que un navegador reciba los avisos del usuario anterior. */
export function PushSubscriptionGuard() {
  useEffect(() => {
    void dropForeignPushSubscription()
  }, [])

  return null
}
