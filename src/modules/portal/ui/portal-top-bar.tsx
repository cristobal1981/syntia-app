'use client'

import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/src/modules/portal/ui/notification-bell'
import { PortalTopBarCreateConsulta } from '@/src/modules/portal/ui/portal-top-bar-create-consulta'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
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
        'portal-menu-corner relative flex h-12 shrink-0 items-center gap-2 bg-sidebar px-3 sm:gap-3 sm:px-4',
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell className="lg:hidden" />

        <PortalActionTooltip
          content={
            sidebarCollapsed
              ? portal.shell.sidebarExpandLabel
              : portal.shell.sidebarCollapseLabel
          }
        >
          <button
            type="button"
            onClick={onSidebarToggle}
            className="hidden size-8 items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex"
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
        </PortalActionTooltip>

        <PortalActionTooltip
          content={
            mobileNavOpen
              ? portal.shell.mobileNavCloseLabel
              : portal.shell.mobileNavOpenLabel
          }
        >
          <button
            type="button"
            onClick={onMobileNavToggle}
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            aria-label={
              mobileNavOpen
                ? portal.shell.mobileNavCloseLabel
                : portal.shell.mobileNavOpenLabel
            }
          >
            {mobileNavOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </PortalActionTooltip>
      </div>

      <div className="relative min-w-0 w-full max-w-md lg:max-w-lg">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          disabled
          placeholder={portal.shell.searchPlaceholder}
          aria-label={`${portal.shell.searchPlaceholder} (próximamente)`}
          className="h-8 w-full cursor-not-allowed rounded-md border border-border bg-background pr-3 pl-8 text-sm text-muted-foreground placeholder:text-muted-foreground/80 dark:bg-card dark:text-muted-foreground dark:placeholder:text-muted-foreground/80"
        />
      </div>

      <div className="min-w-2 flex-1" aria-hidden />

      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell className="hidden lg:flex" />
        <PortalTopBarCreateConsulta />
        <ThemeToggle className="shrink-0" />
      </div>
    </header>
  )
}
