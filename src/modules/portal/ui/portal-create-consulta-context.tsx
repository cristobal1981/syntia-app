'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { openParamFromListKind } from '@/src/modules/portal/domain/chatter-notifications-types'
import { PORTAL_CREATE_CONSULTA_SHORTCUT } from '@/src/modules/portal/domain/portal-shortcuts'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { TramiteCreateConsultaDrawer } from '@/src/modules/tramites/ui/tramite-create-consulta-drawer'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

type PortalCreateConsultaContextValue = {
  openCreateConsulta: () => void
  isOpen: boolean
  isAvailable: boolean
}

const PortalCreateConsultaContext =
  createContext<PortalCreateConsultaContextValue | null>(null)

export function usePortalCreateConsultaOptional() {
  return useContext(PortalCreateConsultaContext)
}

export function usePortalCreateConsulta() {
  const context = useContext(PortalCreateConsultaContext)
  if (!context) {
    throw new Error(
      'usePortalCreateConsulta must be used within PortalCreateConsultaProvider'
    )
  }
  return context
}

type PortalCreateConsultaProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function PortalCreateConsultaProvider({
  children,
  enabled,
}: PortalCreateConsultaProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isProfileRoute = pathname === '/perfil' || pathname.startsWith('/perfil/')
  const isAvailable = enabled && !isProfileRoute

  const openCreateConsulta = useCallback(() => {
    if (!isAvailable) return
    setOpen(true)
  }, [isAvailable])

  usePortalShortcut(PORTAL_CREATE_CONSULTA_SHORTCUT, openCreateConsulta, {
    enabled: isAvailable && !open,
  })

  const handleCreated = (item: TramiteListItem) => {
    setOpen(false)
    router.push(`/tramites?open=${openParamFromListKind('consulta', item.id)}`)
    router.refresh()
  }

  return (
    <PortalCreateConsultaContext.Provider
      value={{ openCreateConsulta, isOpen: open, isAvailable }}
    >
      {children}
      {enabled ? (
        <TramiteCreateConsultaDrawer
          open={open}
          onOpenChange={setOpen}
          onCreated={handleCreated}
        />
      ) : null}
    </PortalCreateConsultaContext.Provider>
  )
}
