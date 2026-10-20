'use server'

import { cookies } from 'next/headers'

import { getRealSession } from '@/src/modules/auth/application/get-session'
import {
  VIEW_AS_COOKIE_NAME,
  VIEW_AS_MAX_AGE_SECONDS,
} from '@/src/modules/auth/domain/types'
import { canStaffViewClient } from '@/src/modules/auth/domain/view-as-policy'
import { fetchViewAsClient } from '@/src/modules/auth/infrastructure/fetch-view-as-client'
import {
  createViewAsToken,
  getSessionSecret,
} from '@/src/modules/auth/infrastructure/session-cookie'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type StartViewAsResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' }

export async function startViewAsClientAction(
  clientUserId: string
): Promise<StartViewAsResult> {
  const session = await getRealSession()
  if (!session || (session.user.role !== 'advisor' && session.user.role !== 'admin')) {
    return { ok: false, error: 'forbidden' }
  }

  const client = await fetchViewAsClient(clientUserId)
  if (!client) return { ok: false, error: 'not_found' }

  const actorId = await resolveDirectoryActorId(session.user)
  if (
    !canStaffViewClient(
      { role: session.user.role, actorId },
      { advisorId: client.advisorId }
    )
  ) {
    return { ok: false, error: 'forbidden' }
  }

  const token = await createViewAsToken(
    {
      staffAuthId: session.user.id,
      clientUserId,
      expiresAt: Date.now() + VIEW_AS_MAX_AGE_SECONDS * 1000,
    },
    getSessionSecret()
  )
  const cookieStore = await cookies()
  cookieStore.set(VIEW_AS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VIEW_AS_MAX_AGE_SECONDS,
  })

  // Rastro de quién ve a quién (sin datos del cliente más allá de su id).
  console.info(
    `[view-as] ${JSON.stringify({ staff: session.user.id, role: session.user.role, client: clientUserId })}`
  )
  return { ok: true }
}
