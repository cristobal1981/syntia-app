import { cache } from 'react'
import { headers } from 'next/headers'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { canStaffViewClient } from '@/src/modules/auth/domain/view-as-policy'
import { fetchViewAsClient } from '@/src/modules/auth/infrastructure/fetch-view-as-client'
import { getViewAsFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

const resolveOverlay = cache(
  async (token: string, staffAuthId: string, staffRole: string, staffEmail: string) => {
    const payload = await getViewAsFromToken(token)
    if (!payload || payload.staffAuthId !== staffAuthId) return null

    const client = await fetchViewAsClient(payload.clientUserId)
    if (!client) return null

    const actorId = await resolveDirectoryActorId({
      id: staffAuthId,
      email: staffEmail,
      name: '',
      role: staffRole as 'advisor' | 'admin',
    })
    // Se comprueba en cada petición: si al asesor le quitan el cliente, la vista se cae.
    if (
      !canStaffViewClient(
        { role: staffRole as 'advisor' | 'admin', actorId },
        { advisorId: client.advisorId }
      )
    ) {
      return null
    }
    return client.user
  }
)

/**
 * Superpone «lo que ve el cliente» a la sesión real del staff. Solo lectura:
 * una server action (cabecera `next-action`) bajo la vista no tiene sesión.
 */
export async function applyViewAs(
  session: PortalSession,
  token: string | undefined
): Promise<PortalSession | null> {
  if (!token) return session
  if (session.user.role !== 'advisor' && session.user.role !== 'admin') return session

  const clientUser = await resolveOverlay(
    token,
    session.user.id,
    session.user.role,
    session.user.email
  )
  // Cookie caducada, de otro usuario o sin permiso: se ignora y manda la sesión real.
  if (!clientUser) return session

  if ((await headers()).get('next-action')) return null

  return { ...session, user: clientUser, viewingAs: { staff: session.user } }
}
