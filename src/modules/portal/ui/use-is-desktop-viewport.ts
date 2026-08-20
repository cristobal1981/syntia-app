'use client'

import { useLayoutEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

function getIsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

/** Matches the `lg` breakpoint the portal sidebar switches on. */
export function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop)

  useLayoutEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    setIsDesktop(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
