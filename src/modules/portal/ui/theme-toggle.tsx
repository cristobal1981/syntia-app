'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { isPortalDarkThemeEnabled } from '@/src/modules/portal/domain/portal-theme-flags'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const darkThemeEnabled = isPortalDarkThemeEnabled()

const options = [
  { value: 'light', label: portal.shell.theme.light, icon: Sun },
  {
    value: 'dark',
    label: portal.shell.theme.dark,
    icon: Moon,
    disabled: !darkThemeEnabled,
    disabledTooltip: portal.shell.theme.darkComingSoon,
  },
  { value: 'system', label: portal.shell.theme.system, icon: Monitor },
] as const

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || darkThemeEnabled || theme !== 'dark') return
    setTheme('light')
  }, [mounted, setTheme, theme])

  if (!mounted) {
    return (
      <div
        className={cn('size-8 rounded-md bg-background dark:bg-sidebar-accent', className)}
        aria-hidden
      />
    )
  }

  return (
    <div
      role="group"
      aria-label={portal.shell.theme.label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 dark:border-border dark:bg-sidebar-accent',
        className
      )}
    >
      {options.map(({ value, label, icon: Icon, ...option }) => {
        const isDisabled = 'disabled' in option && option.disabled
        const tooltip = isDisabled ? option.disabledTooltip : label
        const isActive = theme === value

        return (
          <PortalActionTooltip
            key={value}
            content={tooltip}
            disabled={isDisabled}
          >
            <button
              type="button"
              onClick={() => {
                if (isDisabled) return
                setTheme(value)
              }}
              disabled={isDisabled}
              aria-pressed={isActive}
              aria-label={label}
              aria-disabled={isDisabled || undefined}
              className={cn(
                'flex size-7 items-center justify-center rounded-[5px] transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isDisabled &&
                  'cursor-not-allowed opacity-45 hover:text-on-light-muted dark:hover:text-subtle-foreground',
                isActive
                  ? 'bg-brisa text-agua shadow-sm dark:bg-input dark:text-primary'
                  : 'text-on-light-muted hover:text-on-light-muted dark:text-subtle-foreground dark:hover:text-muted-foreground'
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
