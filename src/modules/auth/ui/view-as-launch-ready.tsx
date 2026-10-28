'use client'

import { useEffect } from 'react'

import { reportViewAsReady } from '@/src/modules/auth/ui/view-as-launch-store'

/** Sin interfaz: se pinta con el banner de «vista como cliente» y avisa de que el portal está listo. */
export function ViewAsLaunchReady() {
  useEffect(() => {
    reportViewAsReady()
  }, [])

  return null
}
