import type { User } from '@supabase/supabase-js'

import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'
import type { PortalRole, PortalUser } from '@/src/modules/auth/domain/types'
import { buildDisplayName } from '@/src/modules/directory/domain/map-directory-row'
import {
  createSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from '@/src/modules/directory/infrastructure/supabase-admin'

const VALID_ROLES: PortalRole[] = ['advisor', 'admin', 'client']

type PortalAccountRow = {
  id: string
  email: string
  role: string
  auth_user_id: string | null
}

type PortalProfileNameRow = {
  first_name: string
  first_surname: string
  second_surname: string
  company_name: string | null
}

function parsePortalRole(role: string | null | undefined): PortalRole | null {
  if (!role) return null
  const normalized = role.toLowerCase()
  if (VALID_ROLES.includes(normalized as PortalRole)) {
    return normalized as PortalRole
  }
  return null
}

async function fetchPortalAccount(
  authUserId: string,
  email: string
): Promise<PortalAccountRow | null> {
  const supabase = createSupabaseAdminClient()

  const { data: byAuth, error: authError } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (authError) {
    throw new Error(authError.message)
  }

  if (byAuth) {
    return byAuth as PortalAccountRow
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return null
  }

  const { data: byEmail, error: emailError } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (emailError) {
    throw new Error(emailError.message)
  }

  return (byEmail as PortalAccountRow | null) ?? null
}

async function linkAuthUserId(accountId: string, authUserId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('users')
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)

  if (error) {
    throw new Error(error.message)
  }
}

async function fetchProfileName(
  userId: string
): Promise<PortalProfileNameRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, first_surname, second_surname, company_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as PortalProfileNameRow | null) ?? null
}

export async function resolvePortalUser(
  authUserId: string,
  email: string,
  fallback: PortalUser
): Promise<PortalUser> {
  if (!isSupabaseServiceRoleConfigured()) {
    return fallback
  }

  const account = await fetchPortalAccount(authUserId, email)
  if (!account) {
    return fallback
  }

  if (!account.auth_user_id) {
    await linkAuthUserId(account.id, authUserId)
  }

  const profile = await fetchProfileName(account.id)
  const role = parsePortalRole(account.role) ?? fallback.role

  return {
    id: authUserId,
    email: account.email ?? fallback.email,
    name: profile
      ? buildDisplayName(
          profile.first_name,
          profile.first_surname,
          profile.second_surname
        )
      : fallback.name,
    role,
    companyName: profile?.company_name?.trim() || fallback.companyName,
  }
}

export async function resolvePortalUserFromAuth(user: User): Promise<PortalUser> {
  const fallback = mapSupabaseUser(user)
  return resolvePortalUser(user.id, user.email ?? '', fallback)
}

export async function refreshPortalUser(user: PortalUser): Promise<PortalUser> {
  return resolvePortalUser(user.id, user.email, user)
}
