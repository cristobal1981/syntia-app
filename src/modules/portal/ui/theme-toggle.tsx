'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'

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
        className={cn('size-8 rounded-md bg-muted', className)}
        aria-hidden
      />
    )
  }

  return (
    <div
      role="group"
      aria-label={portal.shell.theme.label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5',
        className
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={cn(
              'flex size-7 items-center justify-center rounded-[5px] transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
