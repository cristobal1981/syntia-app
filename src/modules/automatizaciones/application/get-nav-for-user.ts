import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'
import type { NavItem } from '@/src/modules/portal/domain/types'
import {
  countVisibleAutomationsForAdvisor,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

const AUTOMATIZACIONES_HREF = '/automatizaciones'

function stripAutomatizacionesNav(items: NavItem[]): NavItem[] {
  return items
    .filter((item) => item.href !== AUTOMATIZACIONES_HREF)
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) => child.href !== AUTOMATIZACIONES_HREF
      ),
    }))
}

export async function shouldShowAutomatizacionesNav(
  user: PortalUser
): Promise<boolean> {
  if (user.role === 'client') {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  try {
    const actorId = await resolveDirectoryActorId(user)
    return (await countVisibleAutomationsForAdvisor(actorId)) > 0
  } catch {
    return false
  }
}

export async function getNavForUser(user: PortalUser): Promise<NavItem[]> {
  const items = getNavForRole(user.role)
  const showAutomatizaciones = await shouldShowAutomatizacionesNav(user)

  if (showAutomatizaciones) {
    return items
  }

  return stripAutomatizacionesNav(items)
}

export async function canAccessAutomatizacionesPage(
  user: PortalUser
): Promise<boolean> {
  if (user.role === 'client') {
    return false
  }
  if (user.role === 'admin') {
    return true
  }
  return shouldShowAutomatizacionesNav(user)
}
