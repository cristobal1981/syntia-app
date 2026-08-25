import type { User } from '@supabase/supabase-js'

import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'
import type { PortalRole, PortalUser } from '@/src/modules/auth/domain/types'
import { resolveClientDisplayName } from '@/src/modules/directory/domain/map-directory-row'
import type { ProfileRow } from '@/src/modules/directory/domain/map-directory-row'
import {
  createSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from '@/src/modules/directory/infrastructure/supabase-admin'

const VALID_ROLES: PortalRole[] = ['advisor', 'admin', 'client', 'worker']

type PortalAccountRow = {
  id: string
  email: string
  role: string
  auth_user_id: string | null
  status: string | null
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
    .select('id, email, role, auth_user_id, status')
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
    .select('id, email, role, auth_user_id, status')
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

/**
 * `archived` es el único estado que bloquea el acceso — cualquier otro
 * valor (incluido uno corrupto/desconocido) se trata como "todavía no
 * activado" y se activa aquí, igual que antes. El acceso a la plataforma
 * no es libre: solo se activa una cuenta al primer login legítimo, nunca
 * al archivarla.
 */
function isAccountArchived(status: string | null): boolean {
  return status?.toLowerCase() === 'archived'
}

async function activatePortalAccountIfInvited(
  accountId: string,
  status: string | null
): Promise<void> {
  if (status?.toLowerCase() === 'active') {
    return
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('users')
    .update({
      status: 'active',
      is_active: true,
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

/**
 * `null` significa "esta identidad no tiene acceso, punto" — ni sesión
 * nueva, ni sesión existente que sobreviva. Tres casos, todos comprobados
 * ANTES de cualquier escritura (link/activar) o de resolver el perfil:
 *  - la fila `users` ya no existe (cuenta eliminada);
 *  - la fila existe pero `status = 'archived'`;
 *  - la fila existe pero `role` no es uno de los roles válidos (columna
 *    corrupta/vaciada) — ya no se hereda el rol de la sesión anterior en
 *    ese caso: un dato que no sabemos interpretar deniega, no mantiene el
 *    último privilegio conocido.
 */
export async function resolvePortalUser(
  authUserId: string,
  email: string,
  fallback: PortalUser
): Promise<PortalUser | null> {
  if (!isSupabaseServiceRoleConfigured()) {
    return fallback
  }

  const account = await fetchPortalAccount(authUserId, email)
  if (!account) {
    return null
  }

  if (isAccountArchived(account.status)) {
    return null
  }

  const role = parsePortalRole(account.role)
  if (!role) {
    return null
  }

  if (!account.auth_user_id) {
    await linkAuthUserId(account.id, authUserId)
  }

  await activatePortalAccountIfInvited(account.id, account.status)

  const profile = await fetchProfileName(account.id)

  return {
    id: authUserId,
    email: account.email ?? fallback.email,
    name: profile
      ? resolveClientDisplayName(profile as ProfileRow)
      : fallback.name,
    role,
    companyName: profile?.company_name?.trim() || fallback.companyName,
  }
}

export async function resolvePortalUserFromAuth(
  user: User
): Promise<PortalUser | null> {
  const fallback = mapSupabaseUser(user)
  return resolvePortalUser(user.id, user.email ?? '', fallback)
}

export async function refreshPortalUser(
  user: PortalUser
): Promise<PortalUser | null> {
  return resolvePortalUser(user.id, user.email, user)
}
