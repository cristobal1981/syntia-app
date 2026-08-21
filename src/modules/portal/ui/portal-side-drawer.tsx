'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

type PortalSideDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  size?: 'default' | 'wide'
  dataTour?: string
}

export function PortalSideDrawer({
  open,
  onOpenChange,
  children,
  size = 'default',
  dataTour,
}: PortalSideDrawerProps) {
  const reducedMotion = usePrefersReducedMotion()

  const panelMotionClass = reducedMotion
    ? ''
    : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300'

  const overlayMotionClass = reducedMotion
    ? ''
    : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200'

  const widthClass = size === 'wide' ? 'sm:max-w-lg' : 'sm:max-w-md'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={overlayMotionClass} />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-tour={dataTour}
          className={cn(
            'fixed inset-y-0 right-0 left-auto z-50 flex h-full max-h-dvh w-full max-w-md translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-none border-y-0 border-r-0 bg-card p-0 shadow-lg outline-none dark:shadow-none [--field-bg:var(--background)]',
            widthClass,
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
