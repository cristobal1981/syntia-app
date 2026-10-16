'use client'

import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { getBottomBarSplit } from '@/src/modules/portal/application/get-bottom-bar-split'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'
import type { NavItem } from '@/src/modules/portal/domain/types'
import { PortalScrollFade } from '@/src/modules/portal/ui/portal-scroll-fade'
import { PortalBrandMark } from '@/src/modules/portal/ui/portal-brand-mark'
import { PortalNotificationsProvider } from '@/src/modules/portal/ui/portal-notifications-context'
import { PortalCreateConsultaProvider } from '@/src/modules/portal/ui/portal-create-consulta-context'
import {
  PortalQuickInvoiceButton,
  PortalQuickInvoiceProvider,
} from '@/src/modules/portal/ui/portal-quick-invoice-context'
import { PortalInviteProvider } from '@/src/modules/invitations/ui/portal-invite-context'
import { PortalReportProblemProvider } from '@/src/modules/portal/ui/portal-report-problem-context'
import { OnboardingChecklistProvider } from '@/src/modules/portal/ui/onboarding-checklist-context'
import {
  PortalEntryLoadingProvider,
  usePortalEntryLoading,
} from '@/src/modules/portal/ui/portal-entry-loading-context'
import { PortalProfileMenu } from '@/src/modules/portal/ui/portal-profile-menu'
import { renderNavItem } from '@/src/modules/portal/ui/portal-nav-items'
import { PortalBottomBar } from '@/src/modules/portal/ui/portal-bottom-bar'
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
  workerWriteSections?: WorkerSectionHref[]
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

export function PortalShell({
  user,
  navItems: navItemsProp,
  workerWriteSections,
  children,
}: PortalShellProps) {
  const pathname = usePathname()
  const reducedMotion = usePrefersReducedMotion()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navPending, setNavPending] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const navItems = navItemsProp ?? getNavForRole(user.role)
  const isClientOrWorker = user.role === 'client' || user.role === 'worker'
  /**
   * "Nueva consulta" crea un ticket/trámite — una mutación, no basta con
   * tener /tramites en lectura (eso solo decide si `navItems` lo incluye).
   * Si el grant o la funcionalidad de colaboradores están desactivados,
   * `workerWriteSections` llega vacío igual que `navItems`.
   */
  const canCreateConsulta =
    user.role === 'client' ||
    (user.role === 'worker' && (workerWriteSections ?? []).includes('/tramites'))
  const { bottomBarItems, moreNavItems } = getBottomBarSplit(navItems, user.role)
  const roleLabel = portal.roles[user.role]

  useEffect(() => {
    // localStorage solo existe en cliente — no se puede leer durante SSR.
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  // Ajuste durante el render (no en un efecto): limpia el indicador de
  // navegación pendiente en cuanto la URL realmente cambia.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setNavPending(false)
    setPendingHref(null)
  }

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
    <PortalNotificationsProvider enabled={isClientOrWorker}>
    {/* Por fuera de la guía: esta necesita saber si el botón de factura existe para listar su paso. */}
    <PortalQuickInvoiceProvider enabled={isClientOrWorker}>
    <OnboardingChecklistProvider enabled={user.role === 'client'}>
    <PortalCreateConsultaProvider enabled={canCreateConsulta}>
    <PortalReportProblemProvider enabled={isClientOrWorker}>
    <PortalInviteProvider enabled={user.role === 'client'}>
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

        <PortalScrollFade
          ariaLabel="Principal"
          className="flex-1"
          scrollClassName={cn('py-2', sidebarCollapsed ? 'px-2' : 'px-3')}
          contentClassName="flex flex-col gap-1"
        >
          {/* «Perfil» ya está en el menú del pie del sidebar; en móvil (sin ese menú) se mantiene. */}
          {navItems
            .filter((item) => item.href !== '/perfil')
            .map((item) =>
              renderNavItem(item, pathname, sidebarCollapsed, pendingHref, undefined, handleNavStart)
            )}
        </PortalScrollFade>

        {/* Fuera de la zona con scroll: la subida rápida debe estar siempre a mano. */}
        <div className={cn('shrink-0 pb-3 empty:hidden', sidebarCollapsed ? 'px-2' : 'px-3')}>
          <PortalQuickInvoiceButton collapsed={sidebarCollapsed} />
        </div>

        <div className={cn('border-t border-sidebar-border py-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
          <PortalProfileMenu
            user={user}
            roleLabel={roleLabel}
            collapsed={sidebarCollapsed}
            onNavigate={handleNavStart}
          />
        </div>
      </aside>

      {/* overflow-clip (no hidden): un contenedor hidden sigue siendo desplazable
          programáticamente (focus/scrollIntoView) y descolocaba la barra superior */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip bg-background">
        <PortalTopBar
          role={user.role}
          navItems={navItems}
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
                  navItems={moreNavItems}
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

        <main
          className={cn(
            'min-h-0 flex-1 overflow-y-auto p-4 sm:p-10',
            bottomBarItems.length > 0 && 'pb-24 lg:pb-10'
          )}
        >
          {children}
        </main>

        <PortalBottomBar
          items={bottomBarItems}
          pendingHref={pendingHref}
          onNavStart={handleNavStart}
        />
      </div>
    </div>
    </PortalEntryLoadingProvider>
    </Suspense>
    </PortalRouteLoadingProvider>
    </PortalInviteProvider>
    </PortalReportProblemProvider>
    </PortalCreateConsultaProvider>
    </OnboardingChecklistProvider>
    </PortalQuickInvoiceProvider>
    </PortalNotificationsProvider>
    </TooltipProvider>
    </PortalShortcutOverlayProvider>
  )
}
