import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type OnboardingFormKind = 'alta_autonomo'

export type OnboardingEmailEventColumn =
  | 'email_delivered_at'
  | 'email_opened_at'
  | 'email_clicked_at'
  | 'email_bounced_at'
  | 'email_complained_at'

export type OnboardingFormAccessToken = {
  id: number
  token: string
  form_kind: OnboardingFormKind
  recipient_email: string | null
  recipient_name: string | null
  odoo_partner_id: number | null
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by: string
  created_at: string
  resend_email_id: string | null
  email_sent_at: string | null
  email_delivered_at: string | null
  email_opened_at: string | null
  email_clicked_at: string | null
  email_bounced_at: string | null
  email_complained_at: string | null
}

type CreateOnboardingFormAccessTokenInput = {
  formKind?: OnboardingFormKind
  recipientEmail?: string
  recipientName?: string
  odooPartnerId?: number
  createdBy: string
}

type OnboardingTokenRow = {
  id: number
  token: string
  form_kind: OnboardingFormKind
  recipient_email: string | null
  recipient_name: string | null
  odoo_partner_id: number | null
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_by: string
  created_at: string
  resend_email_id: string | null
  email_sent_at: string | null
  email_delivered_at: string | null
  email_opened_at: string | null
  email_clicked_at: string | null
  email_bounced_at: string | null
  email_complained_at: string | null
}

const TOKEN_SELECT =
  'id, token, form_kind, recipient_email, recipient_name, odoo_partner_id, expires_at, used_at, revoked_at, created_by, created_at, resend_email_id, email_sent_at, email_delivered_at, email_opened_at, email_clicked_at, email_bounced_at, email_complained_at'

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
    recipient_name: row.recipient_name,
    odoo_partner_id: row.odoo_partner_id,
    expires_at: row.expires_at,
    used_at: row.used_at,
    revoked_at: row.revoked_at,
    created_by: row.created_by,
    created_at: row.created_at,
    resend_email_id: row.resend_email_id,
    email_sent_at: row.email_sent_at,
    email_delivered_at: row.email_delivered_at,
    email_opened_at: row.email_opened_at,
    email_clicked_at: row.email_clicked_at,
    email_bounced_at: row.email_bounced_at,
    email_complained_at: row.email_complained_at,
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

  // Dos updates independientes en vez de un .or() con la cadena interpolada:
  // recipientEmail no está validado como email estricto en este punto, y
  // construir el filtro de Postgrest por interpolación permitiría inyectar
  // condiciones extra (p. ej. una coma en el valor) en la cláusula OR.
  async function revokeMatching(
    column: 'recipient_email' | 'odoo_partner_id',
    value: string | number
  ) {
    const { error } = await supabase
      .from('onboarding_form_access_tokens')
      .update({ revoked_at: revokeAt })
      .eq('form_kind', formKind)
      .is('used_at', null)
      .is('revoked_at', null)
      .eq(column, value)

    if (error) {
      throw new Error(error.message)
    }
  }

  if (recipientEmail) {
    await revokeMatching('recipient_email', recipientEmail)
  }
  if (odooPartnerId !== null) {
    await revokeMatching('odoo_partner_id', odooPartnerId)
  }

  const token = crypto.randomUUID()
  const { data, error } = await supabase
    .from('onboarding_form_access_tokens')
    .insert({
      token,
      form_kind: formKind,
      recipient_email: recipientEmail,
      recipient_name: input.recipientName?.trim() || null,
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

export async function recordOnboardingEmailSent(
  token: string,
  emailId: string | null,
  recipientEmail?: string,
  recipientName?: string
): Promise<void> {
  const normalized = token.trim()
  if (!normalized) {
    return
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('onboarding_form_access_tokens')
    .update({
      resend_email_id: emailId,
      email_sent_at: new Date().toISOString(),
      email_delivered_at: null,
      email_opened_at: null,
      email_clicked_at: null,
      email_bounced_at: null,
      email_complained_at: null,
      ...(recipientEmail !== undefined ? { recipient_email: recipientEmail } : {}),
      ...(recipientName !== undefined ? { recipient_name: recipientName } : {}),
    })
    .eq('token', normalized)

  if (error) {
    throw new Error(error.message)
  }
}

export async function recordOnboardingEmailEvent(
  emailId: string,
  column: OnboardingEmailEventColumn,
  occurredAt: string
): Promise<void> {
  const normalized = emailId.trim()
  if (!normalized) {
    return
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('onboarding_form_access_tokens')
    .update({ [column]: occurredAt })
    .eq('resend_email_id', normalized)
    .is(column, null)

  if (error) {
    throw new Error(error.message)
  }
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
