import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }))

vi.mock('@/src/modules/email/infrastructure/send-email', () => ({ sendEmail }))

import { sendObligacionReminderEmail } from '@/src/modules/obligaciones/application/send-obligacion-reminder-email'

const ORIGINAL_ENV = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  RESEND_INVITE_OVERRIDE_TO: process.env.RESEND_INVITE_OVERRIDE_TO,
}

beforeEach(() => {
  vi.resetAllMocks()
  sendEmail.mockResolvedValue({ id: 'email-1' })
})

afterEach(() => {
  process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV
  process.env.RESEND_INVITE_OVERRIDE_TO = ORIGINAL_ENV.RESEND_INVITE_OVERRIDE_TO
})

describe('sendObligacionReminderEmail', () => {
  it('sends to the real client email when no override is configured', async () => {
    delete process.env.RESEND_INVITE_OVERRIDE_TO

    await sendObligacionReminderEmail({
      to: 'cliente@example.com',
      modelLabel: 'Modelo 303',
      deadline: new Date(2026, 3, 20),
      daysLeft: 5,
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'cliente@example.com' }),
      { required: false }
    )
  })

  it('redirects to RESEND_INVITE_OVERRIDE_TO in dev/preview, never to the real client — this is what keeps a manual test run from emailing a real client', async () => {
    delete process.env.VERCEL_ENV
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendObligacionReminderEmail({
      to: 'cliente-real@example.com',
      modelLabel: 'Modelo 303',
      deadline: new Date(2026, 3, 20),
      daysLeft: 5,
    })

    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.to).toBe('tester@example.com')
    // La prueba también debe quedar visible en el cuerpo del correo.
    expect(emailArg.html).toContain('cliente-real@example.com')
    expect(emailArg.text).toContain('cliente-real@example.com')
  })

  it('never redirects in actual Vercel production, even if the override env var is set', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.RESEND_INVITE_OVERRIDE_TO = 'tester@example.com'

    await sendObligacionReminderEmail({
      to: 'cliente-real@example.com',
      modelLabel: 'Modelo 303',
      deadline: new Date(2026, 3, 20),
      daysLeft: 5,
    })

    const [emailArg] = sendEmail.mock.calls[0]
    expect(emailArg.to).toBe('cliente-real@example.com')
  })
})
