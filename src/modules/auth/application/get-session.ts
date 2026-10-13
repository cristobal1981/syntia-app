import { cookies } from 'next/headers'

import { refreshPortalUser } from '@/src/modules/auth/application/resolve-portal-user'
import {
  SESSION_COOKIE_NAME,
  type PortalSession,
} from '@/src/modules/auth/domain/types'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'
import { isSupabaseServiceRoleConfigured } from '@/src/modules/directory/infrastructure/supabase-admin'

export async function getSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const session = await getSessionFromToken(token)

  if (!session) {
    return null
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return session
  }

  const user = await refreshPortalUser(session.user)
  if (!user) {
    return null
  }

  if (user.role === 'worker') {
    const { active } = await getWorkerAccessStatus(user)
    if (!active) {
      return null
    }
  }

  if (
    user.role === session.user.role &&
    user.name === session.user.name &&
    user.email === session.user.email &&
    user.companyName === session.user.companyName
  ) {
    return session
  }

  return { ...session, user }
}

export { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
