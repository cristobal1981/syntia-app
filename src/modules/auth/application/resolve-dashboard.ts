import type { PortalRole } from '@/src/modules/auth/domain/types'

export function resolveDashboardForRole(_role: PortalRole): '/dashboard' {
  return '/dashboard'
}
