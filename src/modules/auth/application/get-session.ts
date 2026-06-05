import { cookies } from 'next/headers'

import {
  SESSION_COOKIE_NAME,
  type PortalSession,
} from '@/src/modules/auth/domain/types'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'

export async function getSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return getSessionFromToken(token)
}

export { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
