import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

const TABLE = 'client_invitations'

/** Invitaciones ya enviadas por este cliente (cuentan para el límite). */
export async function countInvitationsByInviter(inviterUserId: string): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('inviter_user_id', inviterUserId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Quién invitó ya a este correo, o `null` si nadie. El correo llega normalizado (minúsculas). */
export async function findInviterOfEmail(email: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from(TABLE)
    .select('inviter_user_id')
    .eq('invitee_email', email)
    .limit(1)

  if (error) throw new Error(error.message)
  const row = (data ?? [])[0] as { inviter_user_id?: string } | undefined
  return row?.inviter_user_id ?? null
}

/** ¿Ya existe una cuenta del portal con este correo? (guardado en minúsculas) */
export async function portalAccountExistsForEmail(email: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('users').select('id').eq('email', email).limit(1)

  if (error) throw new Error(error.message)
  return (data ?? []).length > 0
}

/**
 * Registra la invitación. Devuelve `false` si el correo ya estaba invitado
 * (índice único): una carrera entre dos envíos no duplica el correo.
 */
export async function recordInvitation(input: {
  inviterUserId: string
  inviteeEmail: string
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from(TABLE).insert({
    inviter_user_id: input.inviterUserId,
    invitee_email: input.inviteeEmail,
  })

  if (!error) return true
  // 23505 = unique_violation
  if ((error as { code?: string }).code === '23505') return false
  throw new Error(error.message)
}

/** Deshace el registro cuando el correo no llegó a salir, para no gastar cupo en vano. */
export async function removeInvitation(inviteeEmail: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from(TABLE).delete().eq('invitee_email', inviteeEmail)

  if (error) throw new Error(error.message)
}
