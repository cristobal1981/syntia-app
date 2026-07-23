'use client'

import { PersonStanding } from 'lucide-react'
import { useState } from 'react'

import {
  FONT_SCALES,
  useAccessibility,
  type FontScale,
} from '@/components/providers/accessibility-provider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const copy = portal.shell.accessibility

const fontScaleGlyphClasses: Record<FontScale, string> = {
  sm: 'text-[0.7rem]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
}

type ToggleRowProps = {
  label: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}

function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-9 shrink-0 items-center rounded-full border px-0.5 transition-colors',
          checked
            ? 'justify-end border-primary bg-primary'
            : 'justify-start border-border bg-input'
        )}
      >
        <span className="size-4 rounded-full bg-background shadow-sm" />
      </span>
    </button>
  )
}

type AccessibilityMenuProps = {
  className?: string
}

export function AccessibilityMenu({ className }: AccessibilityMenuProps) {
  const [open, setOpen] = useState(false)
  const { settings, setFontScale, setHighContrast, setUnderlineLinks } =
    useAccessibility()

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

        <div className="mt-3 px-2">
          <p className="text-xs font-medium text-muted-foreground">
            {copy.fontSize.label}
          </p>
          <div
            role="group"
            aria-label={copy.fontSize.label}
            className="mt-1.5 inline-flex w-full items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
          >
            {FONT_SCALES.map((scale) => {
              const isActive = settings.fontScale === scale

              return (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setFontScale(scale)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[5px] font-semibold transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    fontScaleGlyphClasses[scale],
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span aria-hidden>A</span>
                  <span className="sr-only">{copy.fontSize.options[scale]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <ToggleRow
            label={copy.highContrast}
            checked={settings.highContrast}
            onCheckedChange={setHighContrast}
          />
          <ToggleRow
            label={copy.underlineLinks}
            checked={settings.underlineLinks}
            onCheckedChange={setUnderlineLinks}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
