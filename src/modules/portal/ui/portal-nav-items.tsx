'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { NavItem } from '@/src/modules/portal/domain/types'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { PortalNavIcon } from '@/src/modules/portal/ui/portal-nav-icon'

export type PortalNavItemSize = 'sm' | 'lg'

export function isNavItemActive(pathname: string, href?: string) {
  if (!href) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isNavGroupActive(pathname: string, item: NavItem) {
  return (
    item.children?.some((child) => isNavItemActive(pathname, child.href)) ?? false
  )
}

const linkSizeClasses: Record<PortalNavItemSize, string> = {
  sm: 'min-h-10 gap-3 px-3 py-2 text-sm',
  lg: 'min-h-12 gap-3 px-3 py-2.5 text-base',
}

const iconSizeClasses: Record<PortalNavItemSize, string> = {
  sm: 'size-4',
  lg: 'size-5',
}

function NavLink({
  href,
  label,
  icon,
  isActive,
  collapsed,
  size = 'sm',
  nested = false,
  isPending = false,
  onNavigate,
  onNavStart,
}: {
  href: string
  label: string
  icon: Parameters<typeof PortalNavIcon>[0]['icon']
  isActive: boolean
  collapsed: boolean
  size?: PortalNavItemSize
  nested?: boolean
  isPending?: boolean
  onNavigate?: () => void
  onNavStart?: (href: string) => void
}) {
  const link = (
    <Link
      href={href}
      onClick={() => {
        onNavStart?.(href)
        onNavigate?.()
      }}
      className={cn(
        'flex items-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        collapsed ? 'min-h-10 justify-center px-2 py-2 text-sm' : linkSizeClasses[size],
        nested && !collapsed && 'ml-2 pl-4',
        isPending && !isActive && 'text-subtle-foreground',
        isActive
          ? 'bg-sidebar-active font-medium text-sidebar-foreground shadow-sm'
          : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-busy={isPending || undefined}
    >
      <PortalNavIcon
        icon={icon}
        className={cn(
          'shrink-0',
          collapsed ? 'size-4' : iconSizeClasses[size],
          isActive && 'text-sidebar-active-foreground'
        )}
      />
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {collapsed ? <span className="sr-only">{label}</span> : null}
    </Link>
  )

  if (collapsed) {
    return (
      <PortalActionTooltip content={label} side="right">
        {link}
      </PortalActionTooltip>
    )
  }

  return link
}

function NavGroup({
  item,
  pathname,
  collapsed,
  size = 'sm',
  pendingHref,
  onNavigate,
  onNavStart,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  size?: PortalNavItemSize
  pendingHref: string | null
  onNavigate?: () => void
  onNavStart?: (href: string) => void
}) {
  const children = item.children ?? []
  const groupActive = isNavGroupActive(pathname, item)
  const [open, setOpen] = useState(groupActive)
  // Ajuste durante el render (no en un efecto): al entrar en una ruta del
  // grupo se auto-expande; el usuario puede volver a colapsarlo después sin
  // que un efecto lo reabra.
  const [prevGroupActive, setPrevGroupActive] = useState(groupActive)
  if (groupActive !== prevGroupActive) {
    setPrevGroupActive(groupActive)
    if (groupActive) setOpen(true)
  }

  if (collapsed) {
    return (
      <>
        {children.map((child) =>
          child.href ? (
            <NavLink
              key={child.label}
              href={child.href}
              label={child.label}
              icon={child.icon}
              isActive={isNavItemActive(pathname, child.href)}
              isPending={pendingHref === child.href}
              collapsed
              onNavigate={onNavigate}
              onNavStart={onNavStart}
            />
          ) : null
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center rounded-md text-left font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
          linkSizeClasses[size],
          groupActive
            ? 'text-sidebar-foreground'
            : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <PortalNavIcon
          icon={item.icon}
          className={cn(
            'shrink-0',
            iconSizeClasses[size],
            groupActive && 'text-sidebar-active-foreground'
          )}
        />
        <span className="flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn(
            iconSizeClasses[size],
            'shrink-0 transition-transform',
            open ? 'rotate-180' : undefined
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-1 border-l border-sidebar-border pl-2">
          {children.map((child) =>
            child.href ? (
              <NavLink
                key={child.label}
                href={child.href}
                label={child.label}
                icon={child.icon}
                isActive={isNavItemActive(pathname, child.href)}
                isPending={pendingHref === child.href}
                collapsed={false}
                size={size}
                nested
                onNavigate={onNavigate}
                onNavStart={onNavStart}
              />
            ) : null
          )}
        </div>
      ) : null}
    </div>
  )
}

export function renderNavItem(
  item: NavItem,
  pathname: string,
  collapsed: boolean,
  pendingHref: string | null,
  onNavigate?: () => void,
  onNavStart?: (href: string) => void,
  size: PortalNavItemSize = 'sm'
) {
  if (item.children?.length) {
    return (
      <NavGroup
        key={item.label}
        item={item}
        pathname={pathname}
        collapsed={collapsed}
        size={size}
        pendingHref={pendingHref}
        onNavigate={onNavigate}
        onNavStart={onNavStart}
      />
    )
  }

  if (!item.href) return null

  return (
    <NavLink
      key={item.label}
      href={item.href}
      label={item.label}
      icon={item.icon}
      isActive={isNavItemActive(pathname, item.href)}
      isPending={pendingHref === item.href}
      collapsed={collapsed}
      size={size}
      onNavigate={onNavigate}
      onNavStart={onNavStart}
    />
  )
}
