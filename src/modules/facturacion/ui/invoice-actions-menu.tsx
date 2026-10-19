'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type InvoiceMenuAction = {
  key: string
  label: string
  onSelect: () => void
  destructive?: boolean
}

/** Las acciones menos habituales de una factura, recogidas tras un único botón «Más». */
export function InvoiceActionsMenu({ label, actions }: { label: string; actions: InvoiceMenuAction[] }) {
  const [open, setOpen] = useState(false)
  if (actions.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-haspopup="menu" aria-expanded={open}>
          {label}
          <ChevronDown aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <ul role="menu" className="flex flex-col">
          {actions.map((action) => (
            <li key={action.key} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex min-h-10 w-full cursor-pointer items-center rounded-md px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  action.destructive ? 'text-destructive' : 'text-foreground'
                )}
                onClick={() => {
                  setOpen(false)
                  action.onSelect()
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
