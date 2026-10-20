import { cookies } from 'next/headers'

import { applyViewAs } from '@/src/modules/auth/application/resolve-view-as-session'
import { refreshPortalUser } from '@/src/modules/auth/application/resolve-portal-user'
import {
  SESSION_COOKIE_NAME,
  VIEW_AS_COOKIE_NAME,
  type PortalSession,
} from '@/src/modules/auth/domain/types'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'
import { isSupabaseServiceRoleConfigured } from '@/src/modules/directory/infrastructure/supabase-admin'

/**
 * Lee la sesión de la cookie y la revalida contra BD en cada llamada: si la
 * cuenta se archiva o el colaborador pierde acceso, la sesión deja de valer
 * aunque la cookie firmada siga vigente.
 */
export type GetSessionOptions = {
  /**
   * Solo para acciones de LECTURA: bajo «vista como cliente» una server action
   * no tiene sesión salvo que se declare así. Por defecto se deniega.
   */
  allowViewAsRead?: boolean
}

export async function getSession(
  options: GetSessionOptions = {}
): Promise<PortalSession | null> {
  const cookieStore = await cookies()
  const real = await getRealSession(cookieStore)
  if (!real) return null
  return applyViewAs(real, cookieStore.get(VIEW_AS_COOKIE_NAME)?.value, {
    allowActions: options.allowViewAsRead === true,
  })
}

/** Sesión del staff real, sin la superposición de «vista como cliente». */
export async function getRealSession(
  cookieStore?: Awaited<ReturnType<typeof cookies>>
): Promise<PortalSession | null> {
  cookieStore ??= await cookies()
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
