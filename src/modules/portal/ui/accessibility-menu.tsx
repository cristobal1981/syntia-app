'use client'

import { PersonStanding } from 'lucide-react'
import { useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { AccessibilityControls } from '@/src/modules/portal/ui/accessibility-controls'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const copy = portal.shell.accessibility

type AccessibilityMenuProps = {
  className?: string
}

export function AccessibilityMenu({ className }: AccessibilityMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PortalActionTooltip content={copy.label} disabled={open}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={copy.label}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              className
            )}
          >
            <PersonStanding className="size-[1.125rem]" aria-hidden />
          </button>
        </PopoverTrigger>
      </PortalActionTooltip>

      <PopoverContent align="end" sideOffset={8} className="w-72 p-3">
        <p className="px-2 text-sm font-semibold text-foreground">{copy.title}</p>
        <AccessibilityControls className="mt-3" />
      </PopoverContent>
    </Popover>
  )
}
