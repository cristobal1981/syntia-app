'use client'

import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SideDrawer } from '@/components/ui/side-drawer'

type DirectoryPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

/** Panel lateral para crear/editar en el directorio: título y descripción sobre el formulario, en el marco común. */
export function DirectoryPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DirectoryPanelProps) {
  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} size="wide" layout="padded">
      <div className="flex flex-col gap-2 pr-8 text-left">
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </div>
      {children}
    </SideDrawer>
  )
}
