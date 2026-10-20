'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

type SideDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** `default` = 28 rem, `wide` = 32 rem (desde `sm`). */
  size?: 'default' | 'wide'
  /**
   * `stack`: sin relleno y en columna; el contenido pinta su cabecera, cuerpo con
   * scroll y pie. `padded`: con relleno y scroll propio, para formularios simples.
   */
  layout?: 'stack' | 'padded'
  dataTour?: string
}

/**
 * Cáscara única de todos los paneles laterales derechos: capa con desenfoque,
 * movimiento, posición y botón de cerrar. Solo pone el marco; qué hay dentro
 * (cabecera, formulario, pie) lo decide cada drawer.
 */
export function SideDrawer({
  open,
  onOpenChange,
  children,
  size = 'default',
  layout = 'stack',
  dataTour,
}: SideDrawerProps) {
  const reducedMotion = usePrefersReducedMotion()

  const panelMotionClass = reducedMotion
    ? ''
    : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity]'

  const overlayMotionClass = reducedMotion
    ? ''
    : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={overlayMotionClass} />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-tour={dataTour}
          className={cn(
            'fixed inset-y-0 right-0 left-auto z-50 h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 bg-card shadow-lg outline-none dark:shadow-none [--field-bg:var(--background)]',
            size === 'wide' ? 'sm:max-w-lg' : 'sm:max-w-md',
            layout === 'stack'
              ? 'flex flex-col gap-0 overflow-hidden overscroll-contain p-0'
              : 'grid gap-4 overflow-y-auto overscroll-contain p-6',
            panelMotionClass
          )}
        >
          <DialogClose
            className="absolute top-4 right-4 z-10 cursor-pointer rounded-sm p-1 text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </DialogClose>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
