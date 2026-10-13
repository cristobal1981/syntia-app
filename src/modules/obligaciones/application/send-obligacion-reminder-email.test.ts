import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }))

vi.mock('@/src/modules/email/infrastructure/send-email', () => ({ sendEmail }))

import { sendObligacionReminderDigestEmail } from '@/src/modules/obligaciones/application/send-obligacion-reminder-email'

const ORIGINAL_ENV = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  RESEND_INVITE_OVERRIDE_TO: process.env.RESEND_INVITE_OVERRIDE_TO,
}

const items = [
  { clientName: 'Cliente SL', modelLabel: 'Modelo 303', deadline: new Date(2026, 3, 20), daysLeft: 5 },
]

beforeEach(() => {
  vi.resetAllMocks()
  sendEmail.mockResolvedValue({ id: 'email-1' })
})

afterEach(() => {
  process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV
  process.env.RESEND_INVITE_OVERRIDE_TO = ORIGINAL_ENV.RESEND_INVITE_OVERRIDE_TO
})

describe('sendObligacionReminderDigestEmail', () => {
  it('sends to the real staff email when no override is configured', async () => {
    delete process.env.RESEND_INVITE_OVERRIDE_TO

    await sendObligacionReminderDigestEmail({ to: 'admin@example.com', items })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@example.com' }),
      { required: false }
    )
  })

  it('includes every item of the digest in the email body', async () => {
    delete process.env.RESEND_INVITE_OVERRIDE_TO

    await sendObligacionReminderDigestEmail({
      to: 'admin@example.com',
      items: [
        ...items,
        { clientName: 'Otro Cliente', modelLabel: 'Modelo 111', deadline: new Date(2026, 3, 22), daysLeft: 7 },
      ],
    })

    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.html).toContain('Cliente SL')
    expect(emailArg.html).toContain('Otro Cliente')
    expect(emailArg.text).toContain('Cliente SL')
    expect(emailArg.text).toContain('Otro Cliente')
  })

  it('redirects to RESEND_INVITE_OVERRIDE_TO in dev/preview, never to the real staff recipient — this is what keeps a manual test run from emailing real staff', async () => {
    delete process.env.VERCEL_ENV
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendObligacionReminderDigestEmail({ to: 'admin-real@example.com', items })

    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.to).toBe('tester@example.com')
    // La prueba también debe quedar visible en el cuerpo del correo.
    expect(emailArg.html).toContain('admin-real@example.com')
    expect(emailArg.text).toContain('admin-real@example.com')
  })

  it('never redirects in actual Vercel production, even if the override env var is set', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendObligacionReminderDigestEmail({ to: 'admin-real@example.com', items })

    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.to).toBe('admin-real@example.com')
  })
})
