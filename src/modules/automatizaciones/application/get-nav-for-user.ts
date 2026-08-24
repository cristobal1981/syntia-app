import { isClientOrWorkerRole, type PortalUser } from '@/src/modules/auth/domain/types'
import { getNavForRole } from '@/src/modules/portal/application/get-nav-for-role'
import type { NavItem } from '@/src/modules/portal/domain/types'
import {
  countVisibleAutomationsForAdvisor,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import { isWorkerSectionHref } from '@/src/modules/colaboradores/domain/types'

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

async function filterNavForWorker(
  items: NavItem[],
  user: PortalUser
): Promise<NavItem[]> {
  const allowed = await getAllowedSectionsForWorker(user)
  return items.filter((item) => {
    if (item.href === '/dashboard') return true
    return item.href != null && isWorkerSectionHref(item.href) && allowed.has(item.href)
  })
}

export async function shouldShowAutomatizacionesNav(
  user: PortalUser
): Promise<boolean> {
  if (isClientOrWorkerRole(user.role)) {
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

  if (user.role === 'worker') {
    return filterNavForWorker(items, user)
  }

  const showAutomatizaciones = await shouldShowAutomatizacionesNav(user)

  if (showAutomatizaciones) {
    return items
  }

  return stripAutomatizacionesNav(items)
}

export async function canAccessAutomatizacionesPage(
  user: PortalUser
): Promise<boolean> {
  if (isClientOrWorkerRole(user.role)) {
    return false
  }
  if (user.role === 'admin') {
    return true
  }
  return shouldShowAutomatizacionesNav(user)
}
