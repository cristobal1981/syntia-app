import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Último `mail.message.id` revisado por el barrido, o `null` si aún no hay foto inicial. */
export async function getSweepCursor(): Promise<number | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_sweep_state')
    .select('last_message_id')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as { last_message_id: number | null } | null)?.last_message_id ?? null
}

export async function setSweepCursor(messageId: number): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('portal_sweep_state')
    .upsert({ id: 1, last_message_id: messageId, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)
}
