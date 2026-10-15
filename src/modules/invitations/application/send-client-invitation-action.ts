'use server'

import { checkRateLimit } from '@/lib/rate-limit/check-rate-limit'
import { getSession } from '@/src/modules/auth/application/get-session'
import { sendClientInvitationEmail } from '@/src/modules/email/application/send-client-invitation-email'
import {
  getRemainingInvitations,
  INVITATION_RATE_LIMIT,
  MAX_INVITATIONS_PER_CLIENT,
  validateInviteeEmail,
  type InvitationEmailError,
} from '@/src/modules/invitations/domain/invitation-rules'
import {
  countInvitationsByInviter,
  findInviterOfEmail,
  portalAccountExistsForEmail,
  recordInvitation,
  removeInvitation,
} from '@/src/modules/invitations/infrastructure/client-invitations.supabase'

export type SendClientInvitationResult =
  | { ok: true; remaining: number }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'validation'
        | 'rate_limited'
        | 'limit_reached'
        | 'already_invited'
        | 'send_failed'
        | 'unavailable'
      fieldErrors?: { email: InvitationEmailError }
    }

/**
 * Invita por correo a alguien a conocer Syntia. Solo clientes: el correo no
 * da acceso a nada, solo explica que escriban a contacto@tenaasesores.es.
 *
 * Qué NO se revela: si el correo ya tenía una cuenta o ya lo invitó otro
 * cliente, se responde como enviado sin enviar nada ni gastar cupo, para que
 * esta pantalla no sirva para averiguar quién usa Syntia.
 *
 * El registro se guarda ANTES de enviar (el índice único evita el doble envío
 * en una carrera) y se deshace si el correo no sale.
 */
export async function sendClientInvitationAction(input: {
  email: string
}): Promise<SendClientInvitationResult> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const validation = validateInviteeEmail(input.email, session.user.email)
  if (!validation.ok) {
    return { ok: false, error: 'validation', fieldErrors: { email: validation.error } }
  }
  const { email } = validation

  const allowed = await checkRateLimit(`client-invitation:${session.user.id}`, INVITATION_RATE_LIMIT)
  if (!allowed) return { ok: false, error: 'rate_limited' }

  try {
    const sent = await countInvitationsByInviter(session.user.id)
    if (sent >= MAX_INVITATIONS_PER_CLIENT) {
      return { ok: false, error: 'limit_reached' }
    }

    const previousInviter = await findInviterOfEmail(email)
    if (previousInviter === session.user.id) {
      return { ok: false, error: 'already_invited' }
    }
    if (previousInviter !== null || (await portalAccountExistsForEmail(email))) {
      return { ok: true, remaining: getRemainingInvitations(sent) }
    }

    const recorded = await recordInvitation({
      inviterUserId: session.user.id,
      inviteeEmail: email,
    })
    if (!recorded) {
      return { ok: true, remaining: getRemainingInvitations(sent) }
    }

    try {
      await sendClientInvitationEmail({ inviteeEmail: email })
    } catch (error) {
      console.error('[client-invitation] el correo no salió', {
        message: error instanceof Error ? error.message : String(error),
      })
      await removeInvitation(email).catch(() => undefined)
      return { ok: false, error: 'send_failed' }
    }

    return { ok: true, remaining: getRemainingInvitations(sent + 1) }
  } catch (error) {
    console.error('[client-invitation] fallo inesperado', {
      message: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, error: 'unavailable' }
  }
}
