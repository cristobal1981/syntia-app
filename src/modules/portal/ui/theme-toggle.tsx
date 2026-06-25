'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const options = [
  { value: 'light', label: portal.shell.theme.light, icon: Sun },
  { value: 'dark', label: portal.shell.theme.dark, icon: Moon },
  { value: 'system', label: portal.shell.theme.system, icon: Monitor },
] as const

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={cn('size-8 rounded-md bg-background dark:bg-card', className)}
        aria-hidden
      />
    )
  }

  return (
    <div
      role="group"
      aria-label={portal.shell.theme.label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 dark:bg-card',
        className
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value

        return (
          <PortalActionTooltip key={value} content={label}>
            <button
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={isActive}
              aria-label={label}
              className={cn(
                'flex size-7 items-center justify-center rounded-[5px] transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isActive
                  ? 'bg-brisa text-agua shadow-sm dark:bg-input dark:text-primary'
                  : 'text-on-light-muted/50 hover:text-on-light-muted/75 dark:text-muted-foreground/50 dark:hover:text-muted-foreground'
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
            </button>
          </PortalActionTooltip>
        )
      })}
    </div>
  )
}
