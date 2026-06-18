'use client'

import { XIcon } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'

type DirectoryPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function DirectoryPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DirectoryPanelProps) {
  const reducedMotion = usePrefersReducedMotion()
  const motionClass = reducedMotion
    ? ''
    : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            reducedMotion
              ? ''
              : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200'
          )}
        />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            'fixed top-0 right-0 left-auto z-50 grid h-dvh max-h-dvh w-full max-w-lg translate-x-0 translate-y-0 gap-4 overflow-y-auto rounded-none border-l bg-card p-6 shadow-lg outline-none sm:rounded-none sm:max-w-lg',
            motionClass
          )}
        >
          <div className="flex flex-col gap-2 text-left">
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </div>
          {children}
          <DialogClose
            className="absolute top-4 right-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
