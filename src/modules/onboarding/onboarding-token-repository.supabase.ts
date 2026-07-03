import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type OnboardingFormKind = 'alta_autonomo'

export type OnboardingFormAccessToken = {
  id: number
  token: string
  form_kind: OnboardingFormKind
  recipient_email: string | null
  odoo_partner_id: number | null
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by: string
  created_at: string
}

type CreateOnboardingFormAccessTokenInput = {
  formKind?: OnboardingFormKind
  recipientEmail?: string
  odooPartnerId?: number
  createdBy: string
}

type OnboardingTokenRow = {
  id: number
  token: string
  form_kind: OnboardingFormKind
  recipient_email: string | null
  odoo_partner_id: number | null
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by: string
  created_at: string
}

const TOKEN_SELECT =
  'id, token, form_kind, recipient_email, odoo_partner_id, expires_at, used_at, revoked_at, created_by, created_at'

function normalizeEmail(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized || null
}

function toOnboardingToken(row: OnboardingTokenRow): OnboardingFormAccessToken {
  return {
    id: row.id,
    token: row.token,
    form_kind: row.form_kind,
    recipient_email: row.recipient_email,
    odoo_partner_id: row.odoo_partner_id,
    expires_at: row.expires_at,
    used_at: row.used_at,
    revoked_at: row.revoked_at,
    created_by: row.created_by,
    created_at: row.created_at,
  }
}

export async function createOnboardingFormAccessToken(
  input: CreateOnboardingFormAccessTokenInput
): Promise<OnboardingFormAccessToken> {
  const formKind = input.formKind ?? 'alta_autonomo'
  const recipientEmail = normalizeEmail(input.recipientEmail)
  const odooPartnerId = input.odooPartnerId ?? null

  if (!recipientEmail && !odooPartnerId) {
    throw new Error('ONBOARDING_TOKEN_TARGET_REQUIRED')
  }

  const supabase = createSupabaseAdminClient()
  const revokeAt = new Date().toISOString()

  let revokeQuery = supabase
    .from('onboarding_form_access_tokens')
    .update({ revoked_at: revokeAt })
    .eq('form_kind', formKind)
    .is('used_at', null)
    .is('revoked_at', null)

  if (recipientEmail && odooPartnerId !== null) {
    revokeQuery = revokeQuery.or(
      `recipient_email.eq.${recipientEmail},odoo_partner_id.eq.${odooPartnerId}`
    )
  } else if (recipientEmail) {
    revokeQuery = revokeQuery.eq('recipient_email', recipientEmail)
  } else {
    revokeQuery = revokeQuery.eq('odoo_partner_id', odooPartnerId as number)
  }

  const { error: revokeError } = await revokeQuery
  if (revokeError) {
    throw new Error(revokeError.message)
  }

  const token = crypto.randomUUID()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .insert({
      token,
      form_kind: formKind,
      recipient_email: recipientEmail,
      odoo_partner_id: odooPartnerId,
      created_by: input.createdBy,
    })
    .select(TOKEN_SELECT)
    .single<OnboardingTokenRow>()

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo crear el token onboarding.')
  }

  return toOnboardingToken(data)
}

export async function getOnboardingFormAccessTokenByToken(
  token: string
): Promise<OnboardingFormAccessToken | null> {
  const normalized = token.trim()
  if (!normalized) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .select(TOKEN_SELECT)
    .eq('token', normalized)
    .maybeSingle<OnboardingTokenRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data ? toOnboardingToken(data) : null
}

export async function markOnboardingFormAccessTokenUsed(
  token: string
): Promise<boolean> {
  const normalized = token.trim()
  if (!normalized) {
    return false
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', normalized)
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token')
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) && data.length > 0
}

export async function listOnboardingFormAccessTokens(input?: {
  formKind?: OnboardingFormKind
  limit?: number
}): Promise<OnboardingFormAccessToken[]> {
  const formKind = input?.formKind ?? 'alta_autonomo'
  const limit = input?.limit ?? 100

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .select(TOKEN_SELECT)
    .eq('form_kind', formKind)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => toOnboardingToken(row as OnboardingTokenRow))
}

export async function revokeOnboardingFormAccessToken(
  token: string
): Promise<boolean> {
  const normalized = token.trim()
  if (!normalized) {
    return false
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', normalized)
    .is('used_at', null)
    .is('revoked_at', null)
    .select('token')
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) && data.length > 0
}

export async function deleteOnboardingFormAccessToken(
  token: string
): Promise<boolean> {
  const normalized = token.trim()
  if (!normalized) {
    return false
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .delete()
    .eq('token', normalized)
    .select('token')
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) && data.length > 0
}
