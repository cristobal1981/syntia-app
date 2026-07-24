'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { PORTAL_CREATE_CONSULTA_SHORTCUT } from '@/src/modules/portal/domain/portal-shortcuts'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { acknowledgeTramiteListItemSeenAction } from '@/src/modules/tramites/application/tramites-list-seen-actions'
import {
  formatTramiteListItemKey,
  type TramiteListItem,
} from '@/src/modules/tramites/domain/merge-tramites-list'
import { dispatchTramitesListItemSeen } from '@/src/modules/tramites/domain/tramites-list-seen-events'
import type { ProcedureTicketType } from '@/src/modules/tramites/domain/procedure-ticket-types'
import { TramiteCreateConsultaDrawer } from '@/src/modules/tramites/ui/tramite-create-consulta-drawer'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

export type OpenCreateConsultaOptions = {
  procedure?: ProcedureTicketType
}

type PortalCreateConsultaContextValue = {
  openCreateConsulta: (options?: OpenCreateConsultaOptions) => void
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
  const notifications = useChatterNotificationsOptional()
  const [open, setOpen] = useState(false)
  const [initialProcedure, setInitialProcedure] =
    useState<ProcedureTicketType | null>(null)

  const isProfileRoute = pathname === '/perfil' || pathname.startsWith('/perfil/')
  const isAvailable = enabled && !isProfileRoute

  const openCreateConsulta = useCallback(
    (options?: OpenCreateConsultaOptions) => {
      if (!isAvailable) return
      if (options?.procedure === 'alta-trabajador') {
        router.push('/alta-trabajador')
        return
      }
      setInitialProcedure(options?.procedure ?? null)
      setOpen(true)
    },
    [isAvailable, router]
  )

  usePortalShortcut(
    PORTAL_CREATE_CONSULTA_SHORTCUT,
    () => openCreateConsulta(),
    {
      enabled: isAvailable && !open,
    }
  )

  const handleCreated = (item: TramiteListItem) => {
    const itemKey = formatTramiteListItemKey(item.kind, item.id)
    void acknowledgeTramiteListItemSeenAction(itemKey)
    dispatchTramitesListItemSeen(itemKey)
    setOpen(false)
    setInitialProcedure(null)
    router.refresh()
    void notifications?.refreshNotifications()
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setInitialProcedure(null)
    }
  }

  return (
    <PortalCreateConsultaContext.Provider
      value={{ openCreateConsulta, isOpen: open, isAvailable }}
    >
      {children}
      {enabled ? (
        <TramiteCreateConsultaDrawer
          open={open}
          onOpenChange={handleOpenChange}
          onCreated={handleCreated}
          initialProcedure={initialProcedure}
        />
      ) : null}
    </PortalCreateConsultaContext.Provider>
  )
}
