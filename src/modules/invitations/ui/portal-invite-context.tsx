'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import { InviteDialog } from '@/src/modules/invitations/ui/invite-dialog'

type PortalInviteContextValue = {
  openInvite: () => void
}

const PortalInviteContext = createContext<PortalInviteContextValue | null>(null)

/** `null` fuera del proveedor o cuando las invitaciones no están habilitadas para el rol. */
export function usePortalInviteOptional() {
  return useContext(PortalInviteContext)
}

type PortalInviteProviderProps = {
  children: ReactNode
  /** Solo los clientes pueden invitar. */
  enabled: boolean
}

export function PortalInviteProvider({ children, enabled }: PortalInviteProviderProps) {
  const [open, setOpen] = useState(false)

  if (!enabled) return <>{children}</>

  return (
    <PortalInviteContext.Provider value={{ openInvite: () => setOpen(true) }}>
      {children}
      <InviteDialog open={open} onOpenChange={setOpen} />
    </PortalInviteContext.Provider>
  )
}
