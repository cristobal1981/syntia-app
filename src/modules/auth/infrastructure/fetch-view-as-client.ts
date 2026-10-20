import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveClientDisplayName } from '@/src/modules/directory/domain/map-directory-row'
import type { ProfileRow } from '@/src/modules/directory/domain/map-directory-row'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type ViewAsClient = {
  user: PortalUser
  advisorId: string | null
}

/**
 * Lee un cliente para la «vista como cliente» SIN efectos: no enlaza la
 * cuenta ni la activa (eso lo hace `resolvePortalUser` al primer login real).
 * Sirve también para clientes con el alta sin terminar (`invited`); solo se
 * rechazan los archivados, los que no son `client` y los que aún no tienen
 * identidad de acceso.
 */
export async function fetchViewAsClient(
  clientUserId: string
): Promise<ViewAsClient | null> {
  const supabase = createSupabaseAdminClient()

  const { data: account, error } = await supabase
    .from('users')
    .select('id, email, role, status, auth_user_id')
    .eq('id', clientUserId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!account) return null
  if (account.role?.toLowerCase() !== 'client') return null
  if (account.status?.toLowerCase() === 'archived') return null
  if (!account.auth_user_id) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, first_surname, second_surname, company_name, advisor_id')
    .eq('user_id', account.id)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)

  return {
    user: {
      id: account.auth_user_id as string,
      email: account.email as string,
      name: profile
        ? resolveClientDisplayName(profile as ProfileRow)
        : (account.email as string),
      role: 'client',
      companyName: profile?.company_name?.trim() || undefined,
    },
    advisorId: (profile?.advisor_id as string | null) ?? null,
  }
}
