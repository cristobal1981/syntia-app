'use server'

import { checkRateLimit } from '@/lib/rate-limit/check-rate-limit'
import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import {
  defaultPushPreferences,
  parsePushPreferences,
  parsePushSubscriptionInput,
  type PushPreferences,
} from '@/src/modules/push/domain/push-subscription'
import {
  deletePushSubscription,
  fetchPushPreferences,
  fetchPushSubscriptionOwner,
  refreshPushSubscription,
  updatePushPreferences,
  upsertPushSubscription,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'

export type PushActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: 'forbidden' | 'invalid' | 'rate_limited' | 'not_found' | 'unavailable' }

const SUBSCRIBE_RATE_LIMIT = { limit: 20, windowSeconds: 3600 }

/**
 * Solo la sesión real de un cliente o colaborador: bajo «vista como cliente»
 * `getSession()` no devuelve sesión para una acción, así que el staff nunca
 * suscribe un dispositivo a los avisos del cliente que está viendo.
 */
async function resolveActor(): Promise<string | null> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) return null
  return resolveDirectoryActorId(session.user)
}

export async function subscribePushAction(
  input: unknown
): Promise<PushActionResult<{ preferences: PushPreferences }>> {
  const actorId = await resolveActor()
  if (!actorId) return { ok: false, error: 'forbidden' }

  const parsed = parsePushSubscriptionInput(input)
  if (!parsed) return { ok: false, error: 'invalid' }

  if (!(await checkRateLimit(`push-subscribe:${actorId}`, SUBSCRIBE_RATE_LIMIT))) {
    return { ok: false, error: 'rate_limited' }
  }

  try {
    await upsertPushSubscription(actorId, parsed, defaultPushPreferences)
    return { ok: true, preferences: defaultPushPreferences }
  } catch (error) {
    console.error('[push] subscribe falló', error)
    return { ok: false, error: 'unavailable' }
  }
}

export async function unsubscribePushAction(
  endpoint: unknown
): Promise<PushActionResult> {
  const actorId = await resolveActor()
  if (!actorId) return { ok: false, error: 'forbidden' }
  if (typeof endpoint !== 'string' || !endpoint) {
    return { ok: false, error: 'invalid' }
  }

  try {
    await deletePushSubscription(actorId, endpoint)
    return { ok: true }
  } catch (error) {
    console.error('[push] unsubscribe falló', error)
    return { ok: false, error: 'unavailable' }
  }
}

/** Preferencias de este dispositivo; `not_found` si el servidor no lo conoce. */
export async function getPushPreferencesAction(
  endpoint: unknown
): Promise<PushActionResult<{ preferences: PushPreferences }>> {
  const actorId = await resolveActor()
  if (!actorId) return { ok: false, error: 'forbidden' }
  if (typeof endpoint !== 'string' || !endpoint) {
    return { ok: false, error: 'invalid' }
  }

  try {
    const preferences = await fetchPushPreferences(actorId, endpoint)
    return preferences
      ? { ok: true, preferences }
      : { ok: false, error: 'not_found' }
  } catch (error) {
    console.error('[push] leer preferencias falló', error)
    return { ok: false, error: 'unavailable' }
  }
}

export async function updatePushPreferencesAction(
  endpoint: unknown,
  preferencesInput: unknown
): Promise<PushActionResult> {
  const actorId = await resolveActor()
  if (!actorId) return { ok: false, error: 'forbidden' }

  const preferences = parsePushPreferences(preferencesInput)
  if (typeof endpoint !== 'string' || !endpoint || !preferences) {
    return { ok: false, error: 'invalid' }
  }

  try {
    const updated = await updatePushPreferences(actorId, endpoint, preferences)
    return updated ? { ok: true } : { ok: false, error: 'not_found' }
  } catch (error) {
    console.error('[push] actualizar preferencias falló', error)
    return { ok: false, error: 'unavailable' }
  }
}

export type PushSyncStatus =
  /** El servidor ya la tenía de este usuario: solo se renovaron las claves. */
  | 'refreshed'
  /** El servidor la había perdido (fila borrada): se ha vuelto a registrar. */
  | 'restored'
  /** Es de otra persona: el navegador debe darla de baja. */
  | 'foreign'
  /** Nada que hacer (un usuario que no puede tener push y no hay fila). */
  | 'ignored'

/**
 * Mantiene al día la suscripción de ESTE navegador con el servidor, como hacen las webs con push:
 * al abrir el portal (y al mostrar el interruptor) el navegador manda su suscripción y el
 * servidor la renueva, o la recupera si la perdió. Solo se da de baja cuando es de otra persona;
 * ante cualquier duda (sin sesión, fallo de BD, límite) no se toca nada, porque dar de baja por
 * error obliga al usuario a reactivar las notificaciones.
 */
export async function syncPushSubscriptionAction(
  input: unknown
): Promise<PushActionResult<{ status: PushSyncStatus; preferences?: PushPreferences }>> {
  const parsed = parsePushSubscriptionInput(input)
  if (!parsed) return { ok: false, error: 'invalid' }

  const session = await getSession()
  if (!session) return { ok: false, error: 'forbidden' }

  try {
    const canOwn = isClientOrWorkerRole(session.user.role)
    const actorId = canOwn ? await resolveDirectoryActorId(session.user) : null
    const owner = await fetchPushSubscriptionOwner(parsed.endpoint)

    if (owner !== null && owner !== actorId) return { ok: true, status: 'foreign' }

    if (owner !== null && actorId) {
      if (await refreshPushSubscription(actorId, parsed)) {
        const preferences = (await fetchPushPreferences(actorId, parsed.endpoint)) ?? defaultPushPreferences
        return { ok: true, status: 'refreshed', preferences }
      }
    }

    // Sin fila (o desaparecida a mitad): se registra de nuevo con las preferencias por defecto.
    if (!actorId) return { ok: true, status: 'ignored' }
    if (!(await checkRateLimit(`push-subscribe:${actorId}`, SUBSCRIBE_RATE_LIMIT))) {
      return { ok: false, error: 'rate_limited' }
    }
    await upsertPushSubscription(actorId, parsed, defaultPushPreferences)
    return { ok: true, status: 'restored', preferences: defaultPushPreferences }
  } catch (error) {
    console.error('[push] sincronizar suscripción falló', error)
    return { ok: false, error: 'unavailable' }
  }
}
