'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const order = ['light', 'dark', 'system'] as const

type ThemeValue = (typeof order)[number]

const icons = { light: Sun, dark: Moon, system: Monitor } as const

const labels: Record<ThemeValue, string> = {
  light: portal.shell.theme.light,
  dark: portal.shell.theme.dark,
  system: portal.shell.theme.system,
}

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
        className={cn('size-8 rounded-md bg-background dark:bg-sidebar-accent', className)}
        aria-hidden
      />
    )
  }

  const current: ThemeValue = order.includes(theme as ThemeValue)
    ? (theme as ThemeValue)
    : 'system'
  const next = order[(order.indexOf(current) + 1) % order.length]
  const Icon = icons[current]
  const label = `${portal.shell.theme.currentPrefix} ${labels[current]}. ${portal.shell.theme.switchToPrefix} ${labels[next]}`

  return (
    <PortalActionTooltip content={label}>
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={label}
        className={cn(
          'flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </PortalActionTooltip>
  )
}
