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
