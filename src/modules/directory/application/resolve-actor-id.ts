import type { PortalUser } from '@/src/modules/auth/domain/types'
import { isDirectoryMockMode } from '@/src/modules/directory/infrastructure/directory-env'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export async function resolveDirectoryActorId(
  user: PortalUser
): Promise<string> {
  if (isDirectoryMockMode()) {
    return user.id
  }

  const supabase = createSupabaseAdminClient()

  const { data: byAuth, error: authError } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (authError) {
    throw new Error(authError.message)
  }

  if (byAuth?.id) {
    return byAuth.id
  }

  const { data: byEmail, error: emailError } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()

  if (emailError) {
    throw new Error(emailError.message)
  }

  return byEmail?.id ?? user.id
}
