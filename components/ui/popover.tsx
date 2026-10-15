'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/utils'

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 origin-[--radix-popover-content-transform-origin] rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none',
          // Entrada y salida sutiles: fundido, leve zoom y un desplazamiento corto desde
          // el lado del que cuelga. Sin movimiento si el sistema lo pide.
          'duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=top]:data-[state=open]:slide-in-from-bottom-1 data-[side=bottom]:data-[state=open]:slide-in-from-top-1 data-[side=left]:data-[state=open]:slide-in-from-right-1 data-[side=right]:data-[state=open]:slide-in-from-left-1',
          'data-[side=top]:data-[state=closed]:slide-out-to-bottom-1 data-[side=bottom]:data-[state=closed]:slide-out-to-top-1 data-[side=left]:data-[state=closed]:slide-out-to-right-1 data-[side=right]:data-[state=closed]:slide-out-to-left-1',
          'motion-reduce:animate-none',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
