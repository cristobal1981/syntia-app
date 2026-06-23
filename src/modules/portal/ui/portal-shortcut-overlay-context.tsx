'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'

const PortalShortcutOverlayContext = createContext(false)

export function usePortalShortcutOverlay(): boolean {
  return useContext(PortalShortcutOverlayContext)
}

function isAltKey(event: KeyboardEvent): boolean {
  return event.key === 'Alt' || event.key === 'AltGraph'
}

type PortalShortcutOverlayProviderProps = {
  children: ReactNode
}

export function PortalShortcutOverlayProvider({
  children,
}: PortalShortcutOverlayProviderProps) {
  const [overlayActive, setOverlayActive] = useState(false)

  useEffect(() => {
    const activate = () => setOverlayActive(true)
    const deactivate = () => setOverlayActive(false)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAltKey(event)) {
        event.preventDefault()
        activate()
        return
      }

      if (event.altKey) {
        activate()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isAltKey(event) || !event.altKey) {
        deactivate()
      }
    }

    const handleWindowBlur = () => deactivate()

    const handleVisibilityChange = () => {
      if (document.hidden) deactivate()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <PortalShortcutOverlayContext.Provider value={overlayActive}>
      {children}
      {overlayActive ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
          aria-live="polite"
        >
          <p
            className={cn(
              'rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150'
            )}
          >
            {portal.shortcuts.overlayHint}
          </p>
        </div>
      ) : null}
    </PortalShortcutOverlayContext.Provider>
  )
}
