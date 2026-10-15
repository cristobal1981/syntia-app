import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mapDirectoryEmailError } from '@/src/modules/directory/application/map-directory-email-error'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mapDirectoryEmailError', () => {
  it.each([
    ['unauthorized', { ok: false, error: 'unauthorized' }],
    ['NOT_FOUND', { ok: false, error: 'not_found' }],
  ])('mapea %s a su código', (message, expected) => {
    expect(mapDirectoryEmailError(new Error(message))).toEqual(expected)
  })

  it.each([
    'NO_AUTH_ACCOUNT',
    'ACCOUNT_ARCHIVED',
    'PASSWORD_RESET_FAILED',
    'EMAIL_RATE_LIMIT',
    'RESEND_NOT_CONFIGURED',
    'INVITE_EMAIL_DISABLED',
  ])('%s devuelve un mensaje legible y no se registra como error inesperado', (message) => {
    const result = mapDirectoryEmailError(new Error(message))

    expect(result).toMatchObject({ ok: false, error: 'unknown' })
    expect((result as { message?: string }).message).toBeTruthy()
    expect((result as { message?: string }).message).not.toContain(message)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('REGRESIÓN: un error crudo de Resend no llega a la interfaz (va al log)', () => {
    const secret = 'Resend: API key re_AbC123 invalid for onboarding@resend.dev'

    const result = mapDirectoryEmailError(new Error(secret))

    expect(result).toMatchObject({ ok: false, error: 'unknown' })
    expect(JSON.stringify(result)).not.toContain('re_AbC123')
    expect(JSON.stringify(result)).not.toContain('onboarding@resend.dev')
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('REGRESIÓN: un error técnico desconocido (p. ej. de base de datos) no se filtra', () => {
    const result = mapDirectoryEmailError(
      new Error('duplicate key value violates unique constraint "users_email_key"')
    )

    expect(result).toMatchObject({ ok: false, error: 'unknown' })
    expect(JSON.stringify(result)).not.toContain('users_email_key')
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('un valor que no es Error devuelve un mensaje genérico sin lanzar', () => {
    const result = mapDirectoryEmailError('algo raro')

    expect(result).toMatchObject({ ok: false, error: 'unknown' })
    expect((result as { message?: string }).message).toBeTruthy()
  })
})
