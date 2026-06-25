'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { PORTAL_CREATE_INCIDENCIA_SHORTCUT } from '@/src/modules/portal/domain/portal-shortcuts'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { TramiteCreateIncidenciaDrawer } from '@/src/modules/tramites/ui/tramite-create-incidencia-drawer'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

type PortalCreateIncidenciaContextValue = {
  openCreateIncidencia: () => void
  isOpen: boolean
  isAvailable: boolean
}

const PortalCreateIncidenciaContext =
  createContext<PortalCreateIncidenciaContextValue | null>(null)

export function usePortalCreateIncidenciaOptional() {
  return useContext(PortalCreateIncidenciaContext)
}

export function usePortalCreateIncidencia() {
  const context = useContext(PortalCreateIncidenciaContext)
  if (!context) {
    throw new Error('usePortalCreateIncidencia must be used within PortalCreateIncidenciaProvider')
  }
  return context
}

type PortalCreateIncidenciaProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function PortalCreateIncidenciaProvider({
  children,
  enabled,
}: PortalCreateIncidenciaProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isProfileRoute = pathname === '/perfil' || pathname.startsWith('/perfil/')
  const isAvailable = enabled && !isProfileRoute

  const openCreateIncidencia = useCallback(() => {
    if (!isAvailable) return
    setOpen(true)
  }, [isAvailable])

  usePortalShortcut(PORTAL_CREATE_INCIDENCIA_SHORTCUT, openCreateIncidencia, {
    enabled: isAvailable && !open,
  })

  const handleCreated = (item: TramiteListItem) => {
    setOpen(false)
    router.push(`/tramites?open=incidencia-${item.id}`)
    router.refresh()
  }

  return (
    <PortalCreateIncidenciaContext.Provider
      value={{ openCreateIncidencia, isOpen: open, isAvailable }}
    >
      {children}
      {enabled ? (
        <TramiteCreateIncidenciaDrawer
          open={open}
          onOpenChange={setOpen}
          onCreated={handleCreated}
        />
      ) : null}
    </PortalCreateIncidenciaContext.Provider>
  )
}
