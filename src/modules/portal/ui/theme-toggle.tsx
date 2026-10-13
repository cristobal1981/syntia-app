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
  /** 'row': fila ancha con etiqueta visible, para el menú a pantalla completa de móvil. */
  variant?: 'icon' | 'row'
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // El tema real de next-themes solo se conoce tras hidratar (evita mismatch SSR).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={cn(
          variant === 'row'
            ? 'h-12 w-full rounded-md bg-sidebar-accent/40'
            : 'size-8 rounded-md bg-background dark:bg-sidebar-accent',
          className
        )}
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

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={label}
        className={cn(
          'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-base font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
          className
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className="flex-1">{portal.shell.theme.label}</span>
        <span className="text-sm text-sidebar-muted-foreground">
          {labels[current]}
        </span>
      </button>
    )
  }

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
