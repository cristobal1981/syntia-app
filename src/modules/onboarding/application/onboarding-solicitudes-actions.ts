'use server'

import { onboarding } from '@/content/onboarding'
import {
  buildDirectoryScope,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import {
  deriveOnboardingTokenStatus,
  type OnboardingTokenStatus,
} from '@/src/modules/onboarding/domain/onboarding-token-status'
import { buildOnboardingAccessUrl } from '@/src/modules/onboarding/infrastructure/landing-url'
import {
  createOnboardingFormAccessToken,
  deleteOnboardingFormAccessToken,
  getOnboardingFormAccessTokenByToken,
  listOnboardingFormAccessTokens,
  recordOnboardingEmailSent,
  revokeOnboardingFormAccessToken,
} from '@/src/modules/onboarding/onboarding-token-repository.supabase'
import { sendAltaAutonomoAccessEmail } from '@/src/modules/email/application/send-alta-autonomo-access-email'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'
import { mapDirectoryEmailError } from '@/src/modules/directory/application/map-directory-email-error'

export type OnboardingSolicitudRow = {
  token: string
  status: OnboardingTokenStatus
  recipientEmail: string | null
  clientName: string | null
  clientId: string | null
  expiresAt: string
  createdAt: string
  url: string | null
  resendEmailId: string | null
  emailSentAt: string | null
  emailDeliveredAt: string | null
  emailOpenedAt: string | null
  emailClickedAt: string | null
  emailBouncedAt: string | null
  emailComplainedAt: string | null
}

export type CreateAltaAutonomoAccessLinkResult =
  | { ok: true; url: string; token: string; expiresAt: string; emailSent: boolean }
  | {
      ok: false
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'not_found'
        | 'invalid_client'
        | 'email_failed'
        | 'unknown'
      message?: string
    }

export type OnboardingSolicitudMutationResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

export type ResendOnboardingSolicitudLinkResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'not_active' | 'email_failed' | 'unknown'
      message?: string
    }

export type ListOnboardingSolicitudesResult =
  | { ok: true; rows: OnboardingSolicitudRow[] }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'unknown'
      message?: string
    }

export type GetOnboardingSolicitudDetailResult =
  | { ok: true; row: OnboardingSolicitudRow }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

function buildClientLookup(clients: ClientRecord[]) {
  const byEmail = new Map<string, ClientRecord>()
  const byOdooPartnerId = new Map<number, ClientRecord>()

  for (const client of clients) {
    const email = client.email.trim().toLowerCase()
    if (email) {
      byEmail.set(email, client)
    }
    if (client.odooPartnerId) {
      const partnerId = Number.parseInt(client.odooPartnerId, 10)
      if (Number.isInteger(partnerId)) {
        byOdooPartnerId.set(partnerId, client)
      }
    }
  }

  return { byEmail, byOdooPartnerId }
}

function resolveClientForToken(
  token: {
    recipient_email: string | null
    odoo_partner_id: number | null
  },
  lookup: ReturnType<typeof buildClientLookup>
): Pick<ClientRecord, 'id' | 'name'> | null {
  if (token.odoo_partner_id !== null) {
    const match = lookup.byOdooPartnerId.get(token.odoo_partner_id)
    if (match) return { id: match.id, name: match.name }
  }

  const email = token.recipient_email?.trim().toLowerCase()
  if (email) {
    const match = lookup.byEmail.get(email)
    if (match) return { id: match.id, name: match.name }
  }

  return null
}

function mapTokenToRow(
  token: Awaited<ReturnType<typeof listOnboardingFormAccessTokens>>[number],
  lookup: ReturnType<typeof buildClientLookup>
): OnboardingSolicitudRow {
  const status = deriveOnboardingTokenStatus(token)
  const client = resolveClientForToken(token, lookup)

  return {
    token: token.token,
    status,
    recipientEmail: token.recipient_email,
    clientName: client?.name ?? null,
    clientId: client?.id ?? null,
    expiresAt: token.expires_at,
    createdAt: token.created_at,
    url: status === 'active' ? buildOnboardingAccessUrl(token.token) : null,
    resendEmailId: token.resend_email_id,
    emailSentAt: token.email_sent_at,
    emailDeliveredAt: token.email_delivered_at,
    emailOpenedAt: token.email_opened_at,
    emailClickedAt: token.email_clicked_at,
    emailBouncedAt: token.email_bounced_at,
    emailComplainedAt: token.email_complained_at,
  }
}

async function requireSolicitudesSession() {
  const session = await requireDirectorySession()
  if (session.user.role === 'client') {
    throw new Error('forbidden')
  }
  return session
}

export async function listOnboardingSolicitudesAction(): Promise<ListOnboardingSolicitudesResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()
    const repository = getDirectoryRepository()
    const [tokens, clients] = await Promise.all([
      listOnboardingFormAccessTokens({
        formKind: onboarding.altaAutonomo.formKind,
      }),
      repository.listClients(scope),
    ])

    const lookup = buildClientLookup(clients)
    const rows = tokens.map((token) => mapTokenToRow(token, lookup))

    return { ok: true, rows }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function getOnboardingSolicitudDetailAction(
  token: string
): Promise<GetOnboardingSolicitudDetailResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()
    const repository = getDirectoryRepository()

    const [tokenRecord, clients] = await Promise.all([
      getOnboardingFormAccessTokenByToken(token),
      repository.listClients(scope),
    ])

    if (!tokenRecord || tokenRecord.form_kind !== onboarding.altaAutonomo.formKind) {
      return { ok: false, error: 'not_found' }
    }

    const lookup = buildClientLookup(clients)
    return { ok: true, row: mapTokenToRow(tokenRecord, lookup) }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function resendOnboardingSolicitudLinkAction(
  token: string
): Promise<ResendOnboardingSolicitudLinkResult> {
  try {
    await requireSolicitudesSession()
    const repository = getDirectoryRepository()
    const scope = await buildDirectoryScope()

    const tokenRecord = await getOnboardingFormAccessTokenByToken(token)
    if (!tokenRecord || tokenRecord.form_kind !== onboarding.altaAutonomo.formKind) {
      return { ok: false, error: 'not_found' }
    }

    if (deriveOnboardingTokenStatus(tokenRecord) !== 'active') {
      return { ok: false, error: 'not_active' }
    }

    const recipientEmail = tokenRecord.recipient_email?.trim().toLowerCase()
    if (!recipientEmail) {
      return {
        ok: false,
        error: 'unknown',
        message: 'La solicitud no tiene un correo de destino.',
      }
    }

    const clients = await repository.listClients(scope)
    const lookup = buildClientLookup(clients)
    const client = resolveClientForToken(tokenRecord, lookup)
    const clientFirstName = client
      ? (clients.find((c) => c.id === client.id)?.firstName ?? null)
      : null

    const url = buildOnboardingAccessUrl(tokenRecord.token)
    if (!url) {
      return {
        ok: false,
        error: 'unknown',
        message:
          'NEXT_PUBLIC_ONBOARDING_LANDING_URL (o NEXT_PUBLIC_LANDING_URL) no está configurada.',
      }
    }

    if (!isResendConfigured()) {
      return {
        ok: false,
        error: 'email_failed',
        message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
      }
    }

    try {
      const { emailId } = await sendAltaAutonomoAccessEmail({
        clientEmail: recipientEmail,
        clientFirstName,
        accessLink: url,
        expiresAt: tokenRecord.expires_at,
      })
      await recordOnboardingEmailSent(tokenRecord.token, emailId)
    } catch (emailError) {
      const mapped = mapDirectoryEmailError(emailError)
      return {
        ok: false,
        error: 'email_failed',
        message:
          (!mapped.ok ? mapped.message : undefined) ??
          'No se pudo reenviar el correo con el enlace al cliente.',
      }
    }

    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function createAltaAutonomoAccessLinkAction(
  clientId: string
): Promise<CreateAltaAutonomoAccessLinkResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()

    const repository = getDirectoryRepository()
    const existing = await repository.getClient(clientId)
    if (!existing) {
      return { ok: false, error: 'not_found' }
    }

    if (scope.role === 'advisor' && existing.advisorId !== scope.userId) {
      return { ok: false, error: 'forbidden' }
    }

    const odooPartnerId = existing.odooPartnerId
      ? Number.parseInt(existing.odooPartnerId, 10)
      : null

    if (existing.odooPartnerId && !Number.isInteger(odooPartnerId)) {
      return {
        ok: false,
        error: 'invalid_client',
        message: 'El cliente no tiene un ID de Odoo válido.',
      }
    }

    const created = await createOnboardingFormAccessToken({
      formKind: onboarding.altaAutonomo.formKind,
      recipientEmail: existing.email,
      odooPartnerId: odooPartnerId ?? undefined,
      createdBy: scope.userId,
    })

    const url = buildOnboardingAccessUrl(created.token)
    if (!url) {
      return {
        ok: false,
        error: 'unknown',
        message:
          'NEXT_PUBLIC_ONBOARDING_LANDING_URL (o NEXT_PUBLIC_LANDING_URL) no está configurada.',
      }
    }

    const recipientEmail = existing.email.trim().toLowerCase()
    if (!recipientEmail) {
      return {
        ok: false,
        error: 'invalid_client',
        message: 'El cliente no tiene un correo para enviar el enlace.',
      }
    }

    if (!isResendConfigured()) {
      return {
        ok: false,
        error: 'email_failed',
        message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
      }
    }

    try {
      const { emailId } = await sendAltaAutonomoAccessEmail({
        clientEmail: recipientEmail,
        clientFirstName: existing.firstName,
        accessLink: url,
        expiresAt: created.expires_at,
      })
      await recordOnboardingEmailSent(created.token, emailId)
    } catch (emailError) {
      await revokeOnboardingFormAccessToken(created.token).catch(() => undefined)
      const mapped = mapDirectoryEmailError(emailError)
      return {
        ok: false,
        error: 'email_failed',
        message:
          (!mapped.ok ? mapped.message : undefined) ??
          'No se pudo enviar el correo con el enlace al cliente.',
      }
    }

    return {
      ok: true,
      url,
      token: created.token,
      expiresAt: created.expires_at,
      emailSent: true,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function revokeOnboardingSolicitudAction(
  token: string
): Promise<OnboardingSolicitudMutationResult> {
  try {
    await requireSolicitudesSession()
    const revoked = await revokeOnboardingFormAccessToken(token)
    if (!revoked) {
      return { ok: false, error: 'not_found' }
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function deleteOnboardingSolicitudAction(
  token: string
): Promise<OnboardingSolicitudMutationResult> {
  try {
    await requireSolicitudesSession()
    const deleted = await deleteOnboardingFormAccessToken(token)
    if (!deleted) {
      return { ok: false, error: 'not_found' }
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}
