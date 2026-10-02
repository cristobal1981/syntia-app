import type { PortalRole } from '@/src/modules/auth/domain/types'
import type { NavItem } from '@/src/modules/portal/domain/types'

/**
 * Accesos fijos del bottombar móvil por rol. Solo hrefs planos (sin
 * children) — un grupo como "Usuarios" (admin) no puede ser un tab y se
 * muestra en el drawer ("more") en su lugar.
 */
export const BOTTOM_BAR_HREFS: Record<PortalRole, string[]> = {
  client: ['/dashboard', '/tramites', '/obligaciones', '/documentos', '/firmas'],
  worker: ['/dashboard', '/tramites', '/obligaciones', '/documentos', '/firmas'],
  advisor: ['/dashboard', '/clientes', '/colaboradores', '/automatizaciones'],
  admin: ['/dashboard', '/solicitudes', '/oportunidades', '/automatizaciones'],
}

export function getBottomBarSplit(
  navItems: NavItem[],
  role: PortalRole
): { bottomBarItems: NavItem[]; moreNavItems: NavItem[] } {
  const bottomBarHrefs = BOTTOM_BAR_HREFS[role]
  const bottomBarItems = bottomBarHrefs
    .map((href) => navItems.find((item) => item.href === href))
    .filter((item): item is NavItem => item != null)
  const moreNavItems = navItems.filter((item) => !bottomBarHrefs.includes(item.href ?? ''))
  return { bottomBarItems, moreNavItems }
}
