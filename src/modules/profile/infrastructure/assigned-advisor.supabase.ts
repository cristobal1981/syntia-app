import {
  buildDisplayName,
  PROFILE_SELECT,
  type ProfileRow,
  USER_SELECT,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type AssignedAdvisorSource = {
  name: string
  email: string
}

export async function fetchAssignedAdvisorSourceForClient(
  clientUserId: string
): Promise<AssignedAdvisorSource | null> {
  const supabase = createSupabaseAdminClient()

  const { data: clientProfile, error: clientProfileError } = await supabase
    .from('profiles')
    .select('advisor_id')
    .eq('user_id', clientUserId)
    .maybeSingle()

  if (clientProfileError) {
    throw new Error(clientProfileError.message)
  }

  const advisorId = (clientProfile as Pick<ProfileRow, 'advisor_id'> | null)
    ?.advisor_id
  if (!advisorId) return null

  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').select(USER_SELECT).eq('id', advisorId).maybeSingle(),
    supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('user_id', advisorId)
      .maybeSingle(),
  ])

  if (userResult.error) {
    throw new Error(userResult.error.message)
  }
  if (profileResult.error) {
    throw new Error(profileResult.error.message)
  }

  const advisorUser = userResult.data as UserRow | null
  if (!advisorUser?.email?.trim()) return null

  const advisorProfile = profileResult.data as ProfileRow | null
  const name = advisorProfile
    ? buildDisplayName(
        advisorProfile.first_name,
        advisorProfile.first_surname,
        advisorProfile.second_surname
      )
    : advisorUser.email

  return {
    name,
    email: advisorUser.email.trim(),
  }
}
