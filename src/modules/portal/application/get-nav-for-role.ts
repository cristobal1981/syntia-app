import { portal } from '@/content/portal'
import type { PortalRole } from '@/src/modules/auth/domain/types'
import type { NavItem } from '@/src/modules/portal/domain/types'

export function getNavForRole(role: PortalRole): NavItem[] {
  const items = portal.nav[role] as unknown as NavItem[]
  return items.map((item) => ({
    ...item,
    children: item.children?.map((child) => ({ ...child })),
  }))
}
