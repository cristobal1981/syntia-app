import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type PortalChatterReplyLinkRow = {
  message_id: number
  parent_message_id: number
}

/**
 * Registra que `messageId` es una respuesta explícita a `parentMessageId`,
 * elegida por el cliente en el composer del portal. Nunca se llama a partir
 * del `parent_id` que devuelve Odoo (ver enrich-portal-chatter-messages.ts):
 * Odoo lo autocompleta encadenando al mensaje anterior del hilo tanto si
 * hubo una elección real como si no, así que no es una fuente fiable.
 */
export async function recordChatterReplyLink(input: {
  messageId: number
  parentMessageId: number
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('portal_chatter_reply_links').upsert(
    {
      message_id: input.messageId,
      parent_message_id: input.parentMessageId,
    },
    { onConflict: 'message_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchChatterReplyLinks(
  messageIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  if (!messageIds.length) return map

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_chatter_reply_links')
    .select('message_id, parent_message_id')
    .in('message_id', messageIds)

  if (error) {
    throw new Error(error.message)
  }

  for (const row of (data ?? []) as PortalChatterReplyLinkRow[]) {
    map.set(row.message_id, row.parent_message_id)
  }
  return map
}
