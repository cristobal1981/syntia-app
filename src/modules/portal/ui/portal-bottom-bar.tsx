'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { NavItem } from '@/src/modules/portal/domain/types'
import { isNavItemActive } from '@/src/modules/portal/ui/portal-nav-items'
import { PortalNavIcon } from '@/src/modules/portal/ui/portal-nav-icon'

type PortalBottomBarProps = {
  items: NavItem[]
  pendingHref: string | null
  onNavStart?: (href: string) => void
}

export function PortalBottomBar({ items, pendingHref, onNavStart }: PortalBottomBarProps) {
  const pathname = usePathname()

  if (items.length === 0) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Principal"
    >
      {items.map((item) => {
        if (!item.href) return null
        const active = isNavItemActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavStart?.(item.href as string)}
            aria-current={active ? 'page' : undefined}
            aria-busy={pendingHref === item.href || undefined}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:-ring-inset focus-visible:ring-sidebar-ring focus-visible:outline-none',
              active
                ? 'text-sidebar-active-foreground'
                : 'text-sidebar-muted-foreground hover:text-sidebar-foreground'
            )}
          >
            <PortalNavIcon icon={item.icon} className="size-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
