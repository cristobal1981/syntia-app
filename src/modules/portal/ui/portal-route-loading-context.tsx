'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type PortalRouteLoadingContextValue = {
  routeLoading: boolean
  beginRouteLoading: () => void
  endRouteLoading: () => void
}

const PortalRouteLoadingContext =
  createContext<PortalRouteLoadingContextValue | null>(null)

export function PortalRouteLoadingProvider({ children }: { children: ReactNode }) {
  const [routeLoadingCount, setRouteLoadingCount] = useState(0)

  const beginRouteLoading = useCallback(() => {
    setRouteLoadingCount((count) => count + 1)
  }, [])

  const endRouteLoading = useCallback(() => {
    setRouteLoadingCount((count) => Math.max(0, count - 1))
  }, [])

  const value = useMemo(
    () => ({
      routeLoading: routeLoadingCount > 0,
      beginRouteLoading,
      endRouteLoading,
    }),
    [routeLoadingCount, beginRouteLoading, endRouteLoading]
  )

  return (
    <PortalRouteLoadingContext.Provider value={value}>
      {children}
    </PortalRouteLoadingContext.Provider>
  )
}

function usePortalRouteLoading() {
  const context = useContext(PortalRouteLoadingContext)
  if (!context) {
    throw new Error(
      'usePortalRouteLoading must be used within PortalRouteLoadingProvider'
    )
  }
  return context
}

export function PortalRouteLoadingMarker() {
  const { beginRouteLoading, endRouteLoading } = usePortalRouteLoading()

  useEffect(() => {
    beginRouteLoading()
    return endRouteLoading
  }, [beginRouteLoading, endRouteLoading])

  return null
}

export function usePortalContentLoading(navPending: boolean) {
  const { routeLoading } = usePortalRouteLoading()
  return navPending || routeLoading
}
