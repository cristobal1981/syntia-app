'use server'

import { onboarding } from '@/content/onboarding'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import {
  buildDirectoryScope,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'
import type { ClientRecord, DirectoryListScope } from '@/src/modules/directory/domain/types'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import { resolvePortalEmailFromOdoo } from '@/src/modules/directory/domain/odoo-partner-import'
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
  recipientName: string | null
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
  emailSubject: string | null
  emailHtml: string | null
}

export type CreateAltaAutonomoAccessLinkInput = {
  odooPartnerId: number
  label: string
  contactEmail?: string
  corporateEmail?: string
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

export type RenewExpiredOnboardingSolicitudResult =
  | { ok: true; url: string; token: string; expiresAt: string; emailSent: boolean }
  | {
      ok: false
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'not_found'
        | 'not_expired'
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

function mapTokenToRow(
  token: Awaited<ReturnType<typeof listOnboardingFormAccessTokens>>[number]
): OnboardingSolicitudRow {
  const status = deriveOnboardingTokenStatus(token)

  return {
    token: token.token,
    status,
    recipientEmail: token.recipient_email,
    recipientName: token.recipient_name,
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
    emailSubject: token.email_subject,
    emailHtml: token.email_html,
  }
}

async function requireSolicitudesSession() {
  const session = await requireDirectorySession()
  if (isClientOrWorkerRole(session.user.role)) {
    throw new Error('forbidden')
  }
  return session
}

export async function listOnboardingSolicitudesAction(): Promise<ListOnboardingSolicitudesResult> {
  try {
    await requireSolicitudesSession()
    const tokens = await listOnboardingFormAccessTokens({
      formKind: onboarding.altaAutonomo.formKind,
    })

    const rows = tokens.map((token) => mapTokenToRow(token))

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
    const tokenRecord = await getOnboardingFormAccessTokenByToken(token)

    if (!tokenRecord || tokenRecord.form_kind !== onboarding.altaAutonomo.formKind) {
      return { ok: false, error: 'not_found' }
    }

    return { ok: true, row: mapTokenToRow(tokenRecord) }
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

/**
 * Si el destinatario de la solicitud ya es cliente en el portal, lo localiza
 * por odoo_partner_id o por el email guardado — así el reenvío puede recoger
 * un email corregido en el directorio sin tener que crear una solicitud nueva.
 */
function findClientForToken(
  tokenRecord: { recipient_email: string | null; odoo_partner_id: number | null },
  clients: ClientRecord[]
): ClientRecord | null {
  if (tokenRecord.odoo_partner_id !== null) {
    const byPartner = clients.find((client) => {
      const partnerId = client.odooPartnerId
        ? Number.parseInt(client.odooPartnerId, 10)
        : null
      return (
        partnerId !== null &&
        Number.isInteger(partnerId) &&
        partnerId === tokenRecord.odoo_partner_id
      )
    })
    if (byPartner) return byPartner
  }

  const email = tokenRecord.recipient_email?.trim().toLowerCase()
  if (email) {
    return clients.find((client) => client.email.trim().toLowerCase() === email) ?? null
  }

  return null
}

export async function resendOnboardingSolicitudLinkAction(
  token: string
): Promise<ResendOnboardingSolicitudLinkResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()

    const tokenRecord = await getOnboardingFormAccessTokenByToken(token)
    if (!tokenRecord || tokenRecord.form_kind !== onboarding.altaAutonomo.formKind) {
      return { ok: false, error: 'not_found' }
    }

    if (deriveOnboardingTokenStatus(tokenRecord) !== 'active') {
      return { ok: false, error: 'not_active' }
    }

    // Si ya es cliente en el portal, prioriza su email/nombre actuales sobre
    // los guardados en la solicitud.
    const clients = await getDirectoryRepository().listClients(scope)
    const matchedClient = findClientForToken(tokenRecord, clients)

    const recipientEmail = (
      matchedClient?.email ?? tokenRecord.recipient_email ?? ''
    )
      .trim()
      .toLowerCase()
    if (!recipientEmail) {
      return {
        ok: false,
        error: 'unknown',
        message: 'La solicitud no tiene un correo de destino.',
      }
    }

    const recipientName = matchedClient?.name ?? tokenRecord.recipient_name ?? undefined

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
      const { emailId, subject, html } = await sendAltaAutonomoAccessEmail({
        clientEmail: recipientEmail,
        accessLink: url,
        expiresAt: tokenRecord.expires_at,
      })
      await recordOnboardingEmailSent(tokenRecord.token, emailId, {
        recipientEmail,
        recipientName,
        emailSubject: subject,
        emailHtml: html,
      })
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

/**
 * Núcleo de la creación de una solicitud a partir de un contacto de Odoo, sin
 * sesión de asesor — lo usa tanto la action de la UI como el webhook público
 * de Odoo (`app/api/odoo/solicitudes/route.ts`), cada uno resolviendo su
 * propio `scope` (sesión real o uno sintético para la llamada de servicio).
 */
export async function createAltaAutonomoAccessLinkCore(
  partner: CreateAltaAutonomoAccessLinkInput,
  scope: DirectoryListScope
): Promise<CreateAltaAutonomoAccessLinkResult> {
  try {
    // Comprobar Resend antes de crear nada: evita dejar un token huérfano
    // (creado pero sin poder enviarse) si el correo no está configurado.
    if (!isResendConfigured()) {
      console.error(
        '[solicitudes] Resend no configurado (RESEND_API_KEY/RESEND_FROM_EMAIL).'
      )
      return {
        ok: false,
        error: 'email_failed',
        message: 'Resend no está configurado. No se pudo enviar el correo al cliente.',
      }
    }

    const odooEmail = resolvePortalEmailFromOdoo(
      partner.contactEmail,
      partner.corporateEmail
    )
      .trim()
      .toLowerCase()

    // Si el contacto ya es cliente en el portal, usa sus datos actuales de
    // Supabase (email/nombre) en vez de la foto fija que trae Odoo.
    const clients = await getDirectoryRepository().listClients(scope)
    const matchedClient = findClientForToken(
      { recipient_email: odooEmail || null, odoo_partner_id: partner.odooPartnerId },
      clients
    )

    const recipientEmail = (matchedClient?.email ?? odooEmail).trim().toLowerCase()
    if (!recipientEmail) {
      console.error(
        '[solicitudes] Sin email de destino.',
        { odooPartnerId: partner.odooPartnerId, hadContactEmail: Boolean(partner.contactEmail), hadCorporateEmail: Boolean(partner.corporateEmail) }
      )
      return {
        ok: false,
        error: 'invalid_client',
        message: 'Este contacto no tiene un correo de destino.',
      }
    }

    const recipientName = matchedClient?.name ?? partner.label

    let created: Awaited<ReturnType<typeof createOnboardingFormAccessToken>>
    try {
      created = await createOnboardingFormAccessToken({
        formKind: onboarding.altaAutonomo.formKind,
        recipientEmail,
        recipientName,
        odooPartnerId: partner.odooPartnerId,
        createdBy: scope.userId,
      })
    } catch (tokenError) {
      console.error('[solicitudes] No se pudo crear el token.', tokenError)
      return {
        ok: false,
        error: 'unknown',
        message:
          tokenError instanceof Error
            ? `No se pudo crear la solicitud: ${tokenError.message}`
            : 'No se pudo crear la solicitud.',
      }
    }

    const url = buildOnboardingAccessUrl(created.token)
    if (!url) {
      console.error(
        '[solicitudes] NEXT_PUBLIC_ONBOARDING_LANDING_URL no configurada; revocando token huérfano.',
        { token: created.token }
      )
      await revokeOnboardingFormAccessToken(created.token).catch(() => undefined)
      return {
        ok: false,
        error: 'unknown',
        message:
          'NEXT_PUBLIC_ONBOARDING_LANDING_URL (o NEXT_PUBLIC_LANDING_URL) no está configurada.',
      }
    }

    try {
      const { emailId, subject, html } = await sendAltaAutonomoAccessEmail({
        clientEmail: recipientEmail,
        accessLink: url,
        expiresAt: created.expires_at,
      })
      await recordOnboardingEmailSent(created.token, emailId, {
        emailSubject: subject,
        emailHtml: html,
      })
    } catch (emailError) {
      console.error(
        '[solicitudes] Fallo al enviar el correo; revocando token.',
        { token: created.token, recipientEmail },
        emailError
      )
      await revokeOnboardingFormAccessToken(created.token).catch(() => undefined)
      const mapped = mapDirectoryEmailError(emailError)
      return {
        ok: false,
        error: 'email_failed',
        message:
          (!mapped.ok ? mapped.message : undefined) ??
          (emailError instanceof Error
            ? `No se pudo enviar el correo: ${emailError.message}`
            : 'No se pudo enviar el correo con el enlace al cliente.'),
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
    console.error('[solicitudes] Error inesperado creando la solicitud.', error)
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : 'Error desconocido.',
    }
  }
}

export async function createAltaAutonomoAccessLinkAction(
  partner: CreateAltaAutonomoAccessLinkInput
): Promise<CreateAltaAutonomoAccessLinkResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()
    return await createAltaAutonomoAccessLinkCore(partner, scope)
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

/**
 * Reenvío ágil para una solicitud CADUCADA: crea un enlace nuevo para el
 * mismo contacto de Odoo sin pasar por el selector manual, reutilizando
 * createAltaAutonomoAccessLinkCore (revoca el token muerto y manda el
 * correo con el nuevo enlace). Deliberadamente NO extiende la caducidad
 * del token viejo — un enlace caducado que ya pudo haber quedado expuesto
 * (bandeja de correo antigua, etc.) debe seguir muerto para siempre; solo
 * el enlace nuevo, recién enviado, funciona.
 */
export async function renewExpiredOnboardingSolicitudAction(
  token: string
): Promise<RenewExpiredOnboardingSolicitudResult> {
  try {
    await requireSolicitudesSession()
    const scope = await buildDirectoryScope()

    const tokenRecord = await getOnboardingFormAccessTokenByToken(token)
    if (!tokenRecord || tokenRecord.form_kind !== onboarding.altaAutonomo.formKind) {
      return { ok: false, error: 'not_found' }
    }

    if (deriveOnboardingTokenStatus(tokenRecord) !== 'expired') {
      return { ok: false, error: 'not_expired' }
    }

    if (tokenRecord.odoo_partner_id === null) {
      return {
        ok: false,
        error: 'invalid_client',
        message:
          'Esta solicitud no tiene un contacto de Odoo vinculado. Créala de nuevo manualmente.',
      }
    }

    return await createAltaAutonomoAccessLinkCore(
      {
        odooPartnerId: tokenRecord.odoo_partner_id,
        label: tokenRecord.recipient_name ?? tokenRecord.recipient_email ?? 'Sin nombre',
        contactEmail: tokenRecord.recipient_email ?? undefined,
      },
      scope
    )
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
