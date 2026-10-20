'use client'

import { SideDrawer } from '@/components/ui/side-drawer'

type PortalSideDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  size?: 'default' | 'wide'
  dataTour?: string
}

/** Drawer del portal: marco compartido (`SideDrawer`) y contenido libre en columna. */
export function PortalSideDrawer(props: PortalSideDrawerProps) {
  return <SideDrawer {...props} layout="stack" />
}
