import { portal } from '@/content/portal'
import { isClientOrWorkerRole, type PortalRole } from '@/src/modules/auth/domain/types'
import type { PortalSearchItem } from '@/src/modules/portal/domain/portal-search-types'
import type { NavItem } from '@/src/modules/portal/domain/types'

function navItemToSearchItem(item: NavItem, groupLabel?: string): PortalSearchItem | null {
  if (!item.href) return null

  return {
    id: `nav:${item.href}`,
    kind: 'page',
    label: item.label,
    description: groupLabel ? `${groupLabel} · ${item.label}` : undefined,
    href: item.href,
    icon: item.icon,
    keywords: groupLabel ? [groupLabel, item.label] : [item.label],
  }
}

function flattenNavItems(items: NavItem[]): PortalSearchItem[] {
  const results: PortalSearchItem[] = []

  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) {
        const entry = navItemToSearchItem(child, item.label)
        if (entry) results.push(entry)
      }
      continue
    }

    const entry = navItemToSearchItem(item)
    if (entry) results.push(entry)
  }

  return results
}

function extrasForRole(role: PortalRole): PortalSearchItem[] {
  return portal.search.extras[role].map((extra) => ({
    id: extra.id,
    kind: 'page' as const,
    label: extra.label,
    description: extra.description,
    href: extra.href,
    icon: extra.icon,
    keywords: extra.keywords,
  }))
}

/**
 * `navItems` debe ser el nav ya resuelto para el usuario concreto (p. ej. el
 * de `getNavForUser`, que para un colaborador ya viene filtrado por sus
 * secciones permitidas) — usar `getNavForRole(role)` aquí ignoraría ese
 * filtrado y mostraría en el buscador secciones a las que no tiene acceso.
 */
export function buildPortalSearchIndex(
  role: PortalRole,
  navItems: NavItem[],
  allowedHrefs?: Set<string>
): PortalSearchItem[] {
  const navSearchItems = flattenNavItems(navItems)
  const extras = extrasForRole(role).filter(
    (item) => !allowedHrefs || (item.href != null && allowedHrefs.has(item.href))
  )
  const seen = new Set<string>()

  return [...navSearchItems, ...extras].filter((item) => {
    if (!item.href || seen.has(item.href)) return false
    seen.add(item.href)
    return true
  })
}

export function buildPortalSearchActions(
  role: PortalRole,
  query: string,
  allowedHrefs?: Set<string>
): PortalSearchItem[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const actions: PortalSearchItem[] = []
  const encoded = encodeURIComponent(trimmed)

  if (isClientOrWorkerRole(role)) {
    if (!allowedHrefs || allowedHrefs.has('/tramites')) {
      actions.push({
        id: 'action:tramites',
        kind: 'action',
        label: portal.search.actions.tramites.replace('{query}', trimmed),
        href: `/tramites?q=${encoded}`,
        icon: 'procedures',
        keywords: [],
      })
    }
    if (!allowedHrefs || allowedHrefs.has('/obligaciones')) {
      actions.push({
        id: 'action:obligaciones',
        kind: 'action',
        label: portal.search.actions.obligaciones.replace('{query}', trimmed),
        href: `/obligaciones?q=${encoded}`,
        icon: 'obligations',
        keywords: [],
      })
    }
  }

  return actions
}
