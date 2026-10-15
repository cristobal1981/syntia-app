import { isValidEmail } from '@/lib/validation/email'

/**
 * Invitaciones que puede enviar un cliente en total. Es el tope del que
 * colgará el descuento o los puntos máximos cuando existan; hoy solo limita
 * el envío de correos.
 */
export const MAX_INVITATIONS_PER_CLIENT = 5

/** Envíos por hora y cliente: evita ráfagas aunque quede cupo. */
export const INVITATION_RATE_LIMIT = { limit: 5, windowSeconds: 3600 }

export const INVITEE_EMAIL_MAX_LENGTH = 254

export type InvitationEmailError = 'required' | 'invalid' | 'too_long' | 'own_email'

export function normalizeInviteeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Valida el correo de la persona invitada. El propio correo del cliente no
 * se puede invitar. Devuelve el correo normalizado o el motivo del rechazo.
 */
export function validateInviteeEmail(
  value: string,
  inviterEmail: string
): { ok: true; email: string } | { ok: false; error: InvitationEmailError } {
  const email = normalizeInviteeEmail(value)

  if (!email) return { ok: false, error: 'required' }
  if (email.length > INVITEE_EMAIL_MAX_LENGTH) return { ok: false, error: 'too_long' }
  if (!isValidEmail(email)) return { ok: false, error: 'invalid' }
  if (email === normalizeInviteeEmail(inviterEmail)) return { ok: false, error: 'own_email' }

  return { ok: true, email }
}

export function getRemainingInvitations(sent: number): number {
  return Math.max(0, MAX_INVITATIONS_PER_CLIENT - sent)
}
