'use client'

import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/src/modules/portal/ui/theme-toggle'

type PortalTopBarProps = {
  className?: string
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
}

export function PortalTopBar({
  className,
  mobileNavOpen,
  onMobileNavToggle,
  sidebarCollapsed,
  onSidebarToggle,
}: PortalTopBarProps) {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 bg-sidebar px-3 sm:gap-3 sm:px-4',
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onSidebarToggle}
          className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex"
          aria-label={
            sidebarCollapsed
              ? portal.shell.sidebarExpandLabel
              : portal.shell.sidebarCollapseLabel
          }
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </button>

        <button
          type="button"
          onClick={onMobileNavToggle}
          className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav"
          aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileNavOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </div>

      <div className="relative min-w-0 w-full max-w-md lg:max-w-lg">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/70"
          aria-hidden
        />
        <input
          type="search"
          disabled
          placeholder={portal.shell.searchPlaceholder}
          aria-label={`${portal.shell.searchPlaceholder} (próximamente)`}
          className="h-8 w-full cursor-not-allowed rounded-md bg-muted pr-3 pl-8 text-sm text-muted-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="min-w-2 flex-1" aria-hidden />

      <ThemeToggle className="shrink-0" />
    </header>
  )
}
