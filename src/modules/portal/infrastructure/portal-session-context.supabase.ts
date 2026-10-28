import type { PortalUser } from '@/src/modules/auth/domain/types'
import { isMissingRpcError } from '@/src/modules/directory/infrastructure/is-missing-rpc-error'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Actor del directorio y cliente de Odoo (`null` si no tiene cliente enlazado). */
export type PortalSessionContext = { actorId: string; partnerId: number | null }
export type PortalNewsSignalContext = PortalSessionContext & { seq: number }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Tras un fallo no se reintenta la función hasta pasado este tiempo (se usa el camino anterior). */
const RETRY_AFTER_FAILURE_MS = 60_000
const unavailableUntil = new Map<string, number>()

type ContextRow = {
  actor_id: string
  partner_id: number | string | null
  seq?: number | string | null
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Llama a la función SQL. Devuelve `null` si hay que usar el camino anterior: el usuario no tiene
 * un id de Supabase Auth (modo demo), la función aún no existe, falla, o no hay actor en el
 * directorio. Un fallo nunca tumba el portal: el camino anterior hace lo mismo con más consultas.
 */
async function callContextRpc(
  name: 'portal_session_context' | 'portal_news_signal',
  user: PortalUser,
  now: number,
): Promise<ContextRow | null> {
  if (!UUID_PATTERN.test(user.id)) return null
  if ((unavailableUntil.get(name) ?? 0) > now) return null

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc(name, {
      p_auth_user_id: user.id,
      p_email: user.email,
    })
    if (error) {
      if (!isMissingRpcError(error)) console.error(`[portal] ${name} falló`, error.message)
      unavailableUntil.set(name, now + RETRY_AFTER_FAILURE_MS)
      return null
    }
    const row = (data as ContextRow[] | null)?.[0]
    return row && typeof row.actor_id === 'string' ? row : null
  } catch (error) {
    console.error(`[portal] ${name} falló`, error)
    unavailableUntil.set(name, now + RETRY_AFTER_FAILURE_MS)
    return null
  }
}

/** Actor y cliente de Odoo en una consulta, o `null` para usar el camino anterior. */
export async function fetchPortalSessionContext(
  user: PortalUser,
  now: number = Date.now(),
): Promise<PortalSessionContext | null> {
  const row = await callContextRpc('portal_session_context', user, now)
  if (!row) return null
  const partnerId = toNumberOrNull(row.partner_id)
  return {
    actorId: row.actor_id,
    partnerId: partnerId !== null && partnerId > 0 ? partnerId : null,
  }
}

/** Lo anterior más el último evento del cliente, o `null` para usar el camino anterior. */
export async function fetchPortalNewsSignalContext(
  user: PortalUser,
  now: number = Date.now(),
): Promise<PortalNewsSignalContext | null> {
  const row = await callContextRpc('portal_news_signal', user, now)
  if (!row) return null
  const partnerId = toNumberOrNull(row.partner_id)
  return {
    actorId: row.actor_id,
    partnerId: partnerId !== null && partnerId > 0 ? partnerId : null,
    seq: toNumberOrNull(row.seq) ?? 0,
  }
}

/** Solo para pruebas: olvida los fallos recientes. */
export function resetPortalSessionContextFailures(): void {
  unavailableUntil.clear()
}
