import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type {
  PushPreferences,
  PushSubscriptionInput,
} from '@/src/modules/push/domain/push-subscription'

type PushSubscriptionRow = {
  notify_chatter: boolean
  notify_status: boolean
  notify_firmas: boolean
}

function toPreferences(row: PushSubscriptionRow): PushPreferences {
  return {
    chatter: row.notify_chatter,
    status: row.notify_status,
    firmas: row.notify_firmas,
  }
}

/**
 * Guarda (o reasigna) la suscripción de un dispositivo. El endpoint es único:
 * si el mismo navegador cambia de cuenta, la fila pasa al nuevo usuario y se
 * reinicia lo ya enviado.
 */
export async function upsertPushSubscription(
  userId: string,
  input: PushSubscriptionInput,
  preferences: PushPreferences
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      notify_chatter: preferences.chatter,
      notify_status: preferences.status,
      notify_firmas: preferences.firmas,
      sent_keys: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) throw new Error(error.message)
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  if (error) throw new Error(error.message)
}

export async function fetchPushPreferences(
  userId: string,
  endpoint: string
): Promise<PushPreferences | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('notify_chatter, notify_status, notify_firmas')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? toPreferences(data as PushSubscriptionRow) : null
}

/** `true` si la suscripción existe y es del usuario. */
export async function updatePushPreferences(
  userId: string,
  endpoint: string,
  preferences: PushPreferences
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .update({
      notify_chatter: preferences.chatter,
      notify_status: preferences.status,
      notify_firmas: preferences.firmas,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .select('id')

  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

export type DispatchSubscription = {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  preferences: PushPreferences
  sentKeys: string[]
  baselined: boolean
}

type DispatchRow = PushSubscriptionRow & {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  sent_keys: unknown
  baselined_at: string | null
}

/** Todas las suscripciones, para el dispatcher (que corre sin sesión). */
export async function listPushSubscriptions(): Promise<DispatchSubscription[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select(
      'id, user_id, endpoint, p256dh, auth, notify_chatter, notify_status, notify_firmas, sent_keys, baselined_at'
    )

  if (error) throw new Error(error.message)

  return ((data ?? []) as DispatchRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    preferences: toPreferences(row),
    sentKeys: Array.isArray(row.sent_keys)
      ? row.sent_keys.filter((key): key is string => typeof key === 'string')
      : [],
    baselined: row.baselined_at !== null,
  }))
}

export type PushRecipient = {
  id: string
  email: string
  role: string
  authUserId: string | null
  status: string | null
  isActive: boolean | null
}

export async function fetchPushRecipients(
  userIds: string[]
): Promise<Map<string, PushRecipient>> {
  const recipients = new Map<string, PushRecipient>()
  if (userIds.length === 0) return recipients

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id, status, is_active')
    .in('id', userIds)

  if (error) throw new Error(error.message)

  for (const row of (data ?? []) as {
    id: string
    email: string | null
    role: string | null
    auth_user_id: string | null
    status: string | null
    is_active: boolean | null
  }[]) {
    recipients.set(row.id, {
      id: row.id,
      email: row.email ?? '',
      role: (row.role ?? '').toLowerCase(),
      authUserId: row.auth_user_id,
      status: row.status,
      isActive: row.is_active,
    })
  }
  return recipients
}

export async function savePushDispatchState(
  subscriptionId: string,
  sentKeys: string[]
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .update({
      sent_keys: sentKeys,
      baselined_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) throw new Error(error.message)
}

export async function deletePushSubscriptionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('push_subscriptions').delete().in('id', ids)

  if (error) throw new Error(error.message)
}
