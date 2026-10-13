import type { ProfileRow } from '@/src/modules/directory/domain/map-directory-row'
import {
  deliverClientAccessEmail,
  getPortalAccessRedirectUrl,
} from '@/src/modules/directory/infrastructure/client-access-link'
import { deleteClientIntegration } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import {
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
} from '@/src/modules/directory/infrastructure/directory-env'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'

export async function upsertProfile(userId: string, fields: Partial<ProfileRow>) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function rollbackCreatedPortalUser(
  authUserId: string,
  portalUserId?: string
) {
  const supabase = createSupabaseAdminClient()

  if (portalUserId) {
    await deleteClientIntegration(portalUserId)
    await supabase.from('users').delete().eq('id', portalUserId)
  }

  await supabase.auth.admin.deleteUser(authUserId)
}

/**
 * Códigos de error estables (Supabase Auth: `email_exists`/`user_already_exists`;
 * Postgres: `23505` unique_violation vía Postgrest) — mucho más fiables que
 * el texto de `message`, que puede cambiar de redacción entre versiones sin
 * previo aviso (el propio SDK de Postgrest lo advierte explícitamente:
 * "Branch on [code] rather than on message text"). El matching de texto
 * queda solo como red de seguridad para cuando no hay `code` disponible.
 */
const DUPLICATE_EMAIL_ERROR_CODES = new Set([
  'email_exists',
  'user_already_exists',
  '23505',
])

export function isDuplicateEmailError(
  error: { message: string; code?: string | null } | string
): boolean {
  const { message, code } =
    typeof error === 'string' ? { message: error, code: undefined } : error

  if (code && DUPLICATE_EMAIL_ERROR_CODES.has(code)) {
    return true
  }

  const normalized = message.toLowerCase()
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('duplicate') ||
    normalized.includes('unique')
  )
}

function isEmailRateLimitError(message: string): boolean {
  return message.toLowerCase().includes('rate limit')
}

/**
 * Contraseña aleatoria descartada de inmediato: invalida la sesión activa del
 * usuario (Supabase revoca la sesión al cambiar la contraseña vía admin API)
 * sin que nadie llegue a conocerla. El sufijo fijo garantiza mayúscula/dígito/
 * símbolo por si el proyecto de Supabase exige fuerza mínima.
 */
export function buildRandomStrongPassword(): string {
  return `${crypto.randomUUID()}Aa1!`
}

type AuthUserCreation = {
  authUserId: string
  inviteSent: boolean
}

async function createAuthUserWithoutInvite(
  email: string
): Promise<AuthUserCreation> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (error || !data.user) {
    if (error && isDuplicateEmailError(error)) {
      throw new Error('DUPLICATE_EMAIL')
    }
    throw new Error(error?.message ?? 'No se pudo crear el usuario de auth.')
  }

  return { authUserId: data.user.id, inviteSent: false }
}

async function createAuthUserWithResendInvite(
  email: string
): Promise<AuthUserCreation> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: getPortalAccessRedirectUrl() },
  })

  if (error || !data.user) {
    if (error && isDuplicateEmailError(error)) {
      throw new Error('DUPLICATE_EMAIL')
    }
    throw new Error(error?.message ?? 'No se pudo generar la invitación.')
  }

  await deliverClientAccessEmail(email, 'invite')

  return { authUserId: data.user.id, inviteSent: true }
}

export async function createAuthUserForClient(
  email: string
): Promise<AuthUserCreation> {
  if (shouldSkipClientInviteEmail()) {
    return createAuthUserWithoutInvite(email)
  }

  if (shouldUseResendClientInvite()) {
    if (!isResendConfigured()) {
      throw new Error('RESEND_NOT_CONFIGURED')
    }
    return createAuthUserWithResendInvite(email)
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: getPortalAccessRedirectUrl(),
  })

  if (!error && data.user) {
    return { authUserId: data.user.id, inviteSent: true }
  }

  if (error?.message && isEmailRateLimitError(error.message)) {
    if (process.env.NODE_ENV === 'development') {
      return createAuthUserWithoutInvite(email)
    }
    throw new Error('EMAIL_RATE_LIMIT')
  }

  if (error && isDuplicateEmailError(error)) {
    throw new Error('DUPLICATE_EMAIL')
  }

  throw new Error(error?.message ?? 'No se pudo invitar al usuario.')
}
