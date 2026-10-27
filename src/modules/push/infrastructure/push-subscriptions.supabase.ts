import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { getMaxPortalEventSeq } from '@/src/modules/push/infrastructure/portal-events.supabase'
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
 * reinicia lo ya enviado, la foto inicial y los fallos.
 */
export async function upsertPushSubscription(
  userId: string,
  input: PushSubscriptionInput,
  preferences: PushPreferences
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  // Foto inicial de los eventos: solo se avisa de lo que llegue desde ahora.
  const lastEventSeq = await getMaxPortalEventSeq()
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
      // Sin foto inicial ni fallos del dueño anterior: si el mismo navegador
      // cambia de cuenta, el nuevo usuario no recibe de golpe lo pendiente.
      baselined_at: null,
      failure_count: 0,
      last_event_seq: lastEventSeq,
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
  /** Envíos seguidos rechazados por el servicio de push. */
  failureCount: number
  /** Último evento de Odoo procesado; `null` = aún sin foto inicial. */
  lastEventSeq: number | null
}

type DispatchRow = PushSubscriptionRow & {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  sent_keys: unknown
  baselined_at: string | null
  failure_count: number | null
  last_event_seq: number | null
}

/** Filas por petición: PostgREST corta en 1000 sin avisar. */
const LIST_PAGE_SIZE = 1000

/** Todas las suscripciones, para el dispatcher (que corre sin sesión). */
export async function listPushSubscriptions(): Promise<DispatchSubscription[]> {
  const supabase = createSupabaseAdminClient()
  const rows: DispatchRow[] = []

  for (let from = 0; ; from += LIST_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select(
        'id, user_id, endpoint, p256dh, auth, notify_chatter, notify_status, notify_firmas, sent_keys, baselined_at, failure_count, last_event_seq'
      )
      .order('id')
      .range(from, from + LIST_PAGE_SIZE - 1)

    if (error) throw new Error(error.message)

    const page = (data ?? []) as DispatchRow[]
    rows.push(...page)
    if (page.length < LIST_PAGE_SIZE) break
  }

  return rows.map((row) => ({
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
    failureCount: row.failure_count ?? 0,
    lastEventSeq: row.last_event_seq ?? null,
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
      failure_count: 0,
    })
    .eq('id', subscriptionId)

  if (error) throw new Error(error.message)
}

export async function savePushFailureCount(
  subscriptionId: string,
  failureCount: number
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ failure_count: failureCount })
    .eq('id', subscriptionId)

  if (error) throw new Error(error.message)
}

/**
 * Cerrojo de ejecución del dispatcher. Si no se puede ni comprobar (RPC sin
 * desplegar, Supabase caído) se deja pasar y se loguea: un cerrojo roto no debe
 * dejar sin avisos a nadie, igual que el limitador de `checkRateLimit`.
 */
export async function acquirePushDispatchLock(ttlSeconds: number): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('acquire_push_dispatch_lock', {
      p_ttl_seconds: ttlSeconds,
    })
    if (error) {
      console.error('[push] cerrojo del dispatcher falló, se ejecuta sin él', error.message)
      return true
    }
    return data === true
  } catch (error) {
    console.error('[push] cerrojo del dispatcher falló, se ejecuta sin él', error)
    return true
  }
}

export async function releasePushDispatchLock(): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.rpc('release_push_dispatch_lock')
    if (error) console.error('[push] soltar el cerrojo falló', error.message)
  } catch (error) {
    console.error('[push] soltar el cerrojo falló', error)
  }
}

export async function deletePushSubscriptionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('push_subscriptions').delete().in('id', ids)

  if (error) throw new Error(error.message)
}

const CURSOR_UPDATE_CHUNK = 100

/**
 * Marca a varios dispositivos como procesados hasta el evento `seq`. Solo avanza: un cursor nunca
 * retrocede, así que una ejecución del cron que ya estaba en marcha no pisa lo que el usuario vio
 * en la app mientras tanto (`advanceUserPushCursor`). Un cursor vacío (`null`, dispositivo sin foto
 * inicial) cuenta como «por detrás de todo»: en SQL `null < n` no es verdadero, por eso se pide
 * explícitamente; sin eso el dispositivo no se inicializaría nunca y nunca recibiría un push.
 */
export async function advancePushCursors(ids: string[], seq: number): Promise<void> {
  if (ids.length === 0) return
  const supabase = createSupabaseAdminClient()

  for (let from = 0; from < ids.length; from += CURSOR_UPDATE_CHUNK) {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ last_event_seq: seq })
      .or(`last_event_seq.is.null,last_event_seq.lt.${seq}`)
      .in('id', ids.slice(from, from + CURSOR_UPDATE_CHUNK))

    if (error) throw new Error(error.message)
  }
}

/**
 * El usuario ya vio en la app los eventos hasta `seq`: sus dispositivos con push dejan de recibirlos.
 * Solo avanza cursores ya inicializados (un dispositivo sin baseline sigue sin mandar nada) y nunca
 * hacia atrás.
 */
export async function advanceUserPushCursor(userId: string, seq: number): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ last_event_seq: seq })
    .eq('user_id', userId)
    .not('last_event_seq', 'is', null)
    .lt('last_event_seq', seq)

  if (error) throw new Error(error.message)
}

/** Cliente de Odoo de cada usuario (los colaboradores comparten el del titular). */
export async function fetchPartnerIdsByUserIds(
  userIds: string[]
): Promise<Map<string, number>> {
  const partners = new Map<string, number>()
  if (userIds.length === 0) return partners

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('client_integrations')
    .select('user_id, odoo_partner_id')
    .in('user_id', userIds)

  if (error) throw new Error(error.message)

  for (const row of (data ?? []) as { user_id: string; odoo_partner_id: number | null }[]) {
    if (typeof row.odoo_partner_id === 'number' && row.odoo_partner_id > 0) {
      partners.set(row.user_id, row.odoo_partner_id)
    }
  }
  return partners
}
