'use server'

import { cookies, headers } from 'next/headers'

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

/**
 * `NODE_ENV==='production'` no es fiable para decidir `secure`: algunos
 * despliegues no la fijan, dejando la cookie viajar por HTTP plano en
 * producción. `x-forwarded-proto` es lo que el proxy/balanceador real ve;
 * si no viene (dev local sin proxy), cae a NODE_ENV como antes.
 */
async function isRequestSecure(): Promise<boolean> {
  const requestHeaders = await headers()
  const forwardedProto = requestHeaders.get('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }
  return process.env.NODE_ENV === 'production'
}

export async function establishPortalSession(user: PortalUser): Promise<void> {
  const session: PortalSession = {
    user,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }

  const token = await createSessionToken(session, getSessionSecret())
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: await isRequestSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}
