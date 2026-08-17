'use client'

import { ChevronDown, PersonStanding } from 'lucide-react'
import { useState } from 'react'

import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { SignOutButton } from '@/src/modules/auth/ui/sign-out-button'
import type { NavItem } from '@/src/modules/portal/domain/types'
import { AccessibilityControls } from '@/src/modules/portal/ui/accessibility-controls'
import { PortalBrandMark } from '@/src/modules/portal/ui/portal-brand-mark'
import { renderNavItem } from '@/src/modules/portal/ui/portal-nav-items'
import { ThemeToggle } from '@/src/modules/portal/ui/theme-toggle'

const accessibilityCopy = portal.shell.accessibility

type PortalMobileMenuProps = {
  navItems: NavItem[]
  pathname: string
  pendingHref: string | null
  user: PortalUser
  roleLabel: string
  onNavigate: () => void
  onNavStart: (href: string) => void
}

function MobileAccessibilitySection() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-base font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        <PersonStanding className="size-5 shrink-0" aria-hidden />
        <span className="flex-1">{accessibilityCopy.title}</span>
        <ChevronDown
          className={cn('size-5 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="dark mt-1 rounded-md bg-sidebar-accent/40 py-2">
          <AccessibilityControls />
        </div>
      ) : null}
    </div>
  )
}

export function PortalMobileMenu({
  navItems,
  pathname,
  pendingHref,
  user,
  roleLabel,
  onNavigate,
  onNavStart,
}: PortalMobileMenuProps) {
  const userInitial = user.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <nav
      id="mobile-nav"
      className="flex h-full flex-col overflow-y-auto bg-sidebar px-3 py-3 text-sidebar-foreground"
      aria-label="Principal"
    >
      <div className="mb-2 flex justify-center py-2">
        <PortalBrandMark className="max-w-[200px]" />
      </div>

      <div className="flex flex-col gap-1">
        {navItems.map((item) =>
          renderNavItem(item, pathname, false, pendingHref, onNavigate, onNavStart, 'lg')
        )}
      </div>

      <div className="my-3 border-t border-sidebar-border" />

      <div className="flex flex-col gap-1">
        <ThemeToggle variant="row" />
        <MobileAccessibilitySection />
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <div className="flex items-center gap-3 px-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-xs font-semibold text-sidebar-active-foreground"
            aria-hidden
          >
            {userInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </nav>
  )
}
