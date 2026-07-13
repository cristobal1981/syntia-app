'use client'

import { useLayoutEffect, useState } from 'react'

export function shouldUseMobilePdfFallback(): boolean {
  if (typeof window === 'undefined') return false

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  const isNarrowViewport = window.matchMedia('(max-width: 767px)').matches

  return isIos || (isCoarsePointer && isNarrowViewport)
}

export function useMobilePdfFallback(): boolean {
  const [useFallback, setUseFallback] = useState(false)

  useLayoutEffect(() => {
    const update = () => setUseFallback(shouldUseMobilePdfFallback())

    update()

    const coarseMq = window.matchMedia('(pointer: coarse)')
    const narrowMq = window.matchMedia('(max-width: 767px)')

    coarseMq.addEventListener('change', update)
    narrowMq.addEventListener('change', update)

    return () => {
      coarseMq.removeEventListener('change', update)
      narrowMq.removeEventListener('change', update)
    }
  }, [])

  return useFallback
}
