'use client'

import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type { PortalRole } from '@/src/modules/auth/domain/types'
import { AccessibilityMenu } from '@/src/modules/portal/ui/accessibility-menu'
import { NotificationBell } from '@/src/modules/portal/ui/notification-bell'
import { PortalTopBarCreateConsulta } from '@/src/modules/portal/ui/portal-top-bar-create-consulta'
import { PortalTopBarReportProblem } from '@/src/modules/portal/ui/portal-top-bar-report-problem'
import { PortalTopBarSearch } from '@/src/modules/portal/ui/portal-top-bar-search'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { ThemeToggle } from '@/src/modules/portal/ui/theme-toggle'

type PortalTopBarProps = {
  className?: string
  role: PortalRole
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  sidebarCollapsed: boolean
  onSidebarToggle: () => void
  onNavigate?: (href: string) => void
}

export function PortalTopBar({
  className,
  role,
  mobileNavOpen,
  onMobileNavToggle,
  sidebarCollapsed,
  onSidebarToggle,
  onNavigate,
}: PortalTopBarProps) {
  return (
    <header
      className={cn(
        'portal-menu-corner relative flex h-12 shrink-0 items-center gap-2 bg-sidebar px-3 sm:gap-3 sm:px-4',
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1">
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
            className="hidden size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex"
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
            className="flex size-9 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
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

      <PortalTopBarSearch role={role} onNavigate={onNavigate} />

      <div className="min-w-2 flex-1" aria-hidden />

      {/* Móvil/tablet: burger (arriba) → buscador → notificaciones → nueva consulta. */}
      <div className="flex shrink-0 items-center gap-1 lg:hidden">
        <NotificationBell />
        <PortalTopBarCreateConsulta />
      </div>

      {/* Desktop: nueva consulta → notificaciones → accesibilidad → tema → reportar problema. */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <PortalTopBarCreateConsulta />
        <NotificationBell />
        <AccessibilityMenu className="shrink-0" />
        <ThemeToggle className="shrink-0" />
        <PortalTopBarReportProblem />
      </div>
    </header>
  )
}
