import { portal } from '@/content/portal'
import type { PortalRole } from '@/src/modules/auth/domain/types'
import type { NavItem } from '@/src/modules/portal/domain/types'

export function getNavForRole(role: PortalRole): NavItem[] {
  return [...portal.nav[role]]
}
