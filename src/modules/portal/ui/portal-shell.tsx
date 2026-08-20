'use client'

import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { SignOutButton } from '@/src/modules/auth/ui/sign-out-button'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'
import type { NavItem } from '@/src/modules/portal/domain/types'
import { PortalBrandMark } from '@/src/modules/portal/ui/portal-brand-mark'
import { ChatterNotificationsProvider } from '@/src/modules/portal/ui/chatter-notifications-context'
import { PortalCreateConsultaProvider } from '@/src/modules/portal/ui/portal-create-consulta-context'
import { PortalReportProblemProvider } from '@/src/modules/portal/ui/portal-report-problem-context'
import { OnboardingTourProvider } from '@/src/modules/portal/ui/onboarding-tour-context'
import {
  PortalEntryLoadingProvider,
  usePortalEntryLoading,
} from '@/src/modules/portal/ui/portal-entry-loading-context'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { renderNavItem } from '@/src/modules/portal/ui/portal-nav-items'
import { PortalMobileMenu } from '@/src/modules/portal/ui/portal-mobile-menu'
import { PortalShortcutOverlayProvider } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import {
  PortalRouteLoadingProvider,
  usePortalContentLoading,
} from '@/src/modules/portal/ui/portal-route-loading-context'
import { PortalTopBar } from '@/src/modules/portal/ui/portal-top-bar'
import { TooltipProvider } from '@/components/ui/tooltip'

const SIDEBAR_STORAGE_KEY = 'syntia-sidebar-collapsed'
const menuEase = [0.22, 1, 0.36, 1] as const

type PortalShellProps = {
  user: PortalUser
  navItems?: NavItem[]
  children: React.ReactNode
}

function PortalContentProgress({
  navPending,
  reducedMotion,
}: {
  navPending: boolean
  reducedMotion: boolean
}) {
  const entryLoading = usePortalEntryLoading()
  const contentLoading = usePortalContentLoading(navPending)
  if (entryLoading || !contentLoading) return null

  return (
    <div
      className="portal-content-progress pointer-events-none absolute top-12 right-0 z-30 h-1 overflow-hidden bg-primary/15"
      aria-hidden
    >
      <LazyMotion features={domAnimation}>
        <m.div
          className="h-full w-1/3 bg-primary"
          initial={reducedMotion ? false : { x: '-100%' }}
          animate={reducedMotion ? undefined : { x: '400%' }}
          transition={
            reducedMotion
              ? undefined
              : { duration: 1.1, ease: menuEase, repeat: Infinity }
          }
        />
      </LazyMotion>
    </div>
  )
}

export function PortalShell({ user, navItems: navItemsProp, children }: PortalShellProps) {
  const pathname = usePathname()
  const reducedMotion = usePrefersReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navPending, setNavPending] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const navItems = navItemsProp ?? getNavForRole(user.role)
  const roleLabel = portal.roles[user.role]
  const userInitial = user.name.trim().charAt(0).toUpperCase() || '?'

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  useEffect(() => {
    setNavPending(false)
    setPendingHref(null)
  }, [pathname])

  const handleNavStart = (href: string) => {
    if (href !== pathname) {
      setNavPending(true)
      setPendingHref(href)
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <PortalShortcutOverlayProvider>
    <TooltipProvider>
    <ChatterNotificationsProvider enabled={user.role === 'client'}>
    <PortalCreateConsultaProvider enabled={user.role === 'client'}>
    <PortalReportProblemProvider enabled={user.role === 'client'}>
    <OnboardingTourProvider enabled={user.role === 'client'}>
    <PortalRouteLoadingProvider>
    <Suspense fallback={null}>
    <PortalEntryLoadingProvider>
    <div className="flex h-dvh overflow-clip bg-background text-foreground">
      <aside
        className={cn(
          'hidden min-h-0 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex items-center py-5',
            sidebarCollapsed ? 'justify-center px-2' : 'justify-center px-4'
          )}
        >
          <PortalBrandMark collapsed={sidebarCollapsed} priority />
        </div>

        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2',
            sidebarCollapsed ? 'px-2' : 'px-3'
          )}
          aria-label="Principal"
        >
          {navItems.map((item) =>
            renderNavItem(item, pathname, sidebarCollapsed, pendingHref, undefined, handleNavStart)
          )}
        </nav>

        <div className={cn('py-4', sidebarCollapsed ? 'px-2' : 'px-4')}>
          {sidebarCollapsed ? (
            <PortalActionTooltip
              content={`${user.name} · ${roleLabel}`}
              side="right"
            >
              <span
                tabIndex={0}
                className="mx-auto flex size-9 cursor-default items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-active-foreground"
                role="img"
                aria-label={`${user.name} · ${roleLabel}`}
              >
                {userInitial}
              </span>
            </PortalActionTooltip>
          ) : (
            <>
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </p>
              <p className="mt-0.5 text-xs text-sidebar-muted-foreground">
                {roleLabel}
              </p>
            </>
          )}
          <div className={cn('mt-3', sidebarCollapsed && 'flex justify-center')}>
            <SignOutButton collapsed={sidebarCollapsed} />
          </div>
        </div>
      </aside>

      {/* overflow-clip (no hidden): un contenedor hidden sigue siendo desplazable
          programáticamente (focus/scrollIntoView) y descolocaba la barra superior */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background">
        <PortalTopBar
          role={user.role}
          mobileNavOpen={mobileOpen}
          onMobileNavToggle={() => setMobileOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={toggleSidebar}
          onNavigate={handleNavStart}
        />

        <PortalContentProgress
          navPending={navPending}
          reducedMotion={reducedMotion}
        />

        <LazyMotion features={domAnimation}>
          <AnimatePresence initial={false}>
            {mobileOpen ? (
              <m.div
                key="mobile-nav"
                className="fixed inset-x-0 top-12 bottom-0 z-40 lg:hidden"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2, ease: menuEase }}
              >
                <PortalMobileMenu
                  navItems={navItems}
                  pathname={pathname}
                  pendingHref={pendingHref}
                  user={user}
                  roleLabel={roleLabel}
                  onNavigate={() => setMobileOpen(false)}
                  onNavStart={handleNavStart}
                />
              </m.div>
            ) : null}
          </AnimatePresence>
        </LazyMotion>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-10">{children}</main>
      </div>
    </div>
    </PortalEntryLoadingProvider>
    </Suspense>
    </PortalRouteLoadingProvider>
    </OnboardingTourProvider>
    </PortalReportProblemProvider>
    </PortalCreateConsultaProvider>
    </ChatterNotificationsProvider>
    </TooltipProvider>
    </PortalShortcutOverlayProvider>
  )
}
