'use server'

import { cookies } from 'next/headers'

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type PortalSession,
  type PortalUser,
} from '@/src/modules/auth/domain/types'
import {
  createSessionToken,
  getSessionSecret,
} from '@/src/modules/auth/infrastructure/session-cookie'

export async function establishPortalSession(user: PortalUser): Promise<void> {
  const session: PortalSession = {
    user,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }

  const token = await createSessionToken(session, getSessionSecret())
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}
