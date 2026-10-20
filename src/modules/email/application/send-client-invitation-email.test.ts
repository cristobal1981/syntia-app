import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }))

vi.mock('@/src/modules/email/infrastructure/send-email', () => ({ sendEmail }))

import { sendClientInvitationEmail } from '@/src/modules/email/application/send-client-invitation-email'

const ORIGINAL_ENV = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  RESEND_INVITE_OVERRIDE_TO: process.env.RESEND_INVITE_OVERRIDE_TO,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
}

beforeEach(() => {
  vi.resetAllMocks()
  sendEmail.mockResolvedValue({ id: 'email-1' })
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.syntia.es'
})

afterEach(() => {
  process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV
  process.env.RESEND_INVITE_OVERRIDE_TO = ORIGINAL_ENV.RESEND_INVITE_OVERRIDE_TO
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV.NEXT_PUBLIC_SITE_URL
})

describe('sendClientInvitationEmail', () => {
  it('envía a la persona invitada exigiendo que Resend esté configurado', async () => {
    delete process.env.RESEND_INVITE_OVERRIDE_TO

    await sendClientInvitationEmail({ inviteeEmail: 'ana@ejemplo.com' })

    const [email, options] = sendEmail.mock.calls[0]
    expect(email.to).toBe('ana@ejemplo.com')
    expect(email.subject).toBe('Alguien te ha invitado a conocer Syntia')
    expect(email.html).toContain('href="https://app.syntia.es"')
    expect(options).toEqual({ required: true })
  })

  it('en dev/preview redirige a la bandeja de prueba y lo deja visible en el cuerpo', async () => {
    delete process.env.VERCEL_ENV
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendClientInvitationEmail({ inviteeEmail: 'ana@ejemplo.com' })

    const [email] = sendEmail.mock.calls[0]
    expect(email.to).toBe('tester@example.com')
    expect(email.html).toContain('ana@ejemplo.com')
  })

  it('nunca redirige en producción de Vercel', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendClientInvitationEmail({ inviteeEmail: 'ana@ejemplo.com' })

    expect(sendEmail.mock.calls[0][0].to).toBe('ana@ejemplo.com')
  })

  it('propaga el error de envío para que la acción no cuente la invitación', async () => {
    sendEmail.mockRejectedValue(new Error('RESEND_NOT_CONFIGURED'))

    await expect(sendClientInvitationEmail({ inviteeEmail: 'a@b.es' })).rejects.toThrow(
      'RESEND_NOT_CONFIGURED'
    )
  })
})
