import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type AutomatizacionesResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'not_found'
        | 'not_configured'
        | 'invalid_input'
        | 'webhook_failed'
        | 'unknown'
      message?: string
    }

export async function requireStaffSession() {
  const session = await getSession()
  if (!session) {
    throw new Error('unauthorized')
  }
  if (session.user.role === 'client') {
    throw new Error('forbidden')
  }
  const actorId = await resolveDirectoryActorId(session.user)
  return { session, actorId }
}
