'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { SignOutButton } from '@/src/modules/auth/ui/sign-out-button'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'
import { PortalBrandMark } from '@/src/modules/portal/ui/portal-brand-mark'
import { PortalNavIcon } from '@/src/modules/portal/ui/portal-nav-icon'
import { PortalTopBar } from '@/src/modules/portal/ui/portal-top-bar'

const SIDEBAR_STORAGE_KEY = 'syntia-sidebar-collapsed'

type PortalShellProps = {
  user: PortalUser
  children: React.ReactNode
}

function NavLink({
  href,
  label,
  icon,
  isActive,
  collapsed,
  onNavigate,
}: {
  href: string
  label: string
  icon: Parameters<typeof PortalNavIcon>[0]['icon']
  isActive: boolean
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        'flex min-h-10 items-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
        isActive
          ? 'bg-sidebar-active font-medium text-sidebar-active-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <PortalNavIcon icon={icon} className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {collapsed ? <span className="sr-only">{label}</span> : null}
    </Link>
  )
}

export function PortalShell({ user, children }: PortalShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navItems = getNavForRole(user.role)
  const roleLabel = portal.roles[user.role]
  const userInitial = user.name.trim().charAt(0).toUpperCase() || '?'

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside
        className={cn(
          'hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
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
            'flex flex-1 flex-col gap-1 py-2',
            sidebarCollapsed ? 'px-2' : 'px-3'
          )}
          aria-label="Principal"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        <div className={cn('py-4', sidebarCollapsed ? 'px-2' : 'px-4')}>
          {sidebarCollapsed ? (
            <div
              className="mx-auto flex size-9 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-active-foreground"
              title={`${user.name} · ${roleLabel}`}
            >
              {userInitial}
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{roleLabel}</p>
            </>
          )}
          <div className={cn('mt-3', sidebarCollapsed && 'flex justify-center')}>
            <SignOutButton collapsed={sidebarCollapsed} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <PortalTopBar
          mobileNavOpen={mobileOpen}
          onMobileNavToggle={() => setMobileOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={toggleSidebar}
        />

        {mobileOpen ? (
          <nav
            id="mobile-nav"
            className="bg-sidebar px-3 py-3 text-sidebar-foreground lg:hidden"
            aria-label="Principal"
          >
            <div className="mb-4 flex justify-center py-2">
              <PortalBrandMark className="max-w-[200px]" />
            </div>
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.label}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isActive}
                      collapsed={false}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 px-1 py-2">
              <p className="px-2 text-sm font-medium text-foreground">{user.name}</p>
              <p className="mt-0.5 px-2 text-xs text-muted-foreground">{roleLabel}</p>
              <div className="mt-2 px-1">
                <SignOutButton />
              </div>
            </div>
          </nav>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
