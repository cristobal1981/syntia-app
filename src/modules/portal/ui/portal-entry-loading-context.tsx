'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { AuthSessionOverlay } from '@/src/modules/auth/ui/auth-session-overlay'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'

export const PORTAL_ENTRY_SESSION_KEY = 'syntia-portal-entry'

export function markPortalEntryPending() {
  try {
    sessionStorage.setItem(PORTAL_ENTRY_SESSION_KEY, '1')
  } catch {
    // sessionStorage unavailable
  }
}

type PortalEntryLoadingContextValue = {
  entryLoading: boolean
  completePortalEntry: () => void
}

const PortalEntryLoadingContext =
  createContext<PortalEntryLoadingContextValue | null>(null)

export function PortalEntryLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [entryLoading, setEntryLoading] = useState(false)
  const [entryReady, setEntryReady] = useState(false)
  const [entryInitialized, setEntryInitialized] = useState(false)

  useEffect(() => {
    if (entryInitialized || pathname !== '/dashboard') return

    let pending = searchParams.get('entering') === '1'

    try {
      pending =
        pending || sessionStorage.getItem(PORTAL_ENTRY_SESSION_KEY) === '1'
    } catch {
      // ignore
    }

    if (!pending) return

    // Depende de sessionStorage/searchParams (solo legibles en cliente, tras
    // montar) — no es estado derivable durante el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntryLoading(true)
    setEntryInitialized(true)

    if (searchParams.get('entering') === '1') {
      router.replace('/dashboard', { scroll: false })
    }
  }, [entryInitialized, pathname, router, searchParams])

  const dismissEntryOverlay = useCallback(() => {
    try {
      sessionStorage.removeItem(PORTAL_ENTRY_SESSION_KEY)
    } catch {
      // ignore
    }
    setEntryLoading(false)
    setEntryReady(false)
  }, [])

  const completePortalEntry = useCallback(() => {
    if (!entryLoading || entryReady) return
    setEntryReady(true)
  }, [entryLoading, entryReady])

  const value = useMemo(
    () => ({ entryLoading, completePortalEntry }),
    [entryLoading, completePortalEntry]
  )

  return (
    <PortalEntryLoadingContext.Provider value={value}>
      {children}
      {entryLoading ? (
        <AuthSessionOverlay
          variant="entry"
          ready={entryReady}
          onDismiss={dismissEntryOverlay}
        />
      ) : null}
    </PortalEntryLoadingContext.Provider>
  )
}

export function usePortalEntryLoading() {
  return useContext(PortalEntryLoadingContext)?.entryLoading ?? false
}

function useCompletePortalEntry() {
  const context = useContext(PortalEntryLoadingContext)
  if (!context) {
    throw new Error(
      'useCompletePortalEntry must be used within PortalEntryLoadingProvider'
    )
  }
  return context.completePortalEntry
}

export function PortalDashboardReadyMarker() {
  const pathname = usePathname()
  const completePortalEntry = useCompletePortalEntry()
  const notifications = useChatterNotificationsOptional()

  useEffect(() => {
    if (pathname !== '/dashboard') return
    if (notifications?.notificationsLoading) return
    completePortalEntry()
  }, [pathname, notifications?.notificationsLoading, completePortalEntry])

  return null
}
