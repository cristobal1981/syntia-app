import { describe, expect, it } from 'vitest'

import {
  getRemainingInvitations,
  INVITEE_EMAIL_MAX_LENGTH,
  MAX_INVITATIONS_PER_CLIENT,
  normalizeInviteeEmail,
  validateInviteeEmail,
} from '@/src/modules/invitations/domain/invitation-rules'

describe('validateInviteeEmail', () => {
  it('acepta un correo válido y lo devuelve normalizado', () => {
    expect(validateInviteeEmail('  Ana@Ejemplo.COM ', 'yo@tena.es')).toEqual({
      ok: true,
      email: 'ana@ejemplo.com',
    })
  })

  it.each(['', '   '])('rechaza un correo vacío (%j)', (value) => {
    expect(validateInviteeEmail(value, 'yo@tena.es')).toEqual({ ok: false, error: 'required' })
  })

  it.each(['sin-arroba', 'a@b', 'a b@c.es', '@c.es'])('rechaza %j por inválido', (value) => {
    expect(validateInviteeEmail(value, 'yo@tena.es')).toEqual({ ok: false, error: 'invalid' })
  })

  it('rechaza un correo más largo que el máximo antes de validar el formato', () => {
    const long = `${'a'.repeat(INVITEE_EMAIL_MAX_LENGTH)}@x.es`

    expect(validateInviteeEmail(long, 'yo@tena.es')).toEqual({ ok: false, error: 'too_long' })
  })

  it('acepta un correo justo en el máximo', () => {
    const local = 'a'.repeat(INVITEE_EMAIL_MAX_LENGTH - '@x.es'.length)

    expect(validateInviteeEmail(`${local}@x.es`, 'yo@tena.es')).toMatchObject({ ok: true })
  })

  it('no deja invitarse a uno mismo, sin distinguir mayúsculas ni espacios', () => {
    expect(validateInviteeEmail(' YO@Tena.es ', 'yo@tena.es')).toEqual({
      ok: false,
      error: 'own_email',
    })
  })
})

describe('validateInviteeEmail — el correo de quien invita también se normaliza', () => {
  it('detecta el propio correo aunque la cuenta lo tenga con mayúsculas o espacios', () => {
    expect(validateInviteeEmail('yo@tena.es', ' YO@Tena.es ')).toEqual({
      ok: false,
      error: 'own_email',
    })
  })
})

describe('normalizeInviteeEmail', () => {
  it('recorta y pasa a minúsculas', () => {
    expect(normalizeInviteeEmail('  A@B.ES ')).toBe('a@b.es')
  })
})

describe('getRemainingInvitations', () => {
  it('descuenta las enviadas del máximo', () => {
    expect(getRemainingInvitations(0)).toBe(MAX_INVITATIONS_PER_CLIENT)
    expect(getRemainingInvitations(2)).toBe(MAX_INVITATIONS_PER_CLIENT - 2)
  })

  it('nunca baja de cero', () => {
    expect(getRemainingInvitations(MAX_INVITATIONS_PER_CLIENT)).toBe(0)
    expect(getRemainingInvitations(MAX_INVITATIONS_PER_CLIENT + 3)).toBe(0)
  })
})
