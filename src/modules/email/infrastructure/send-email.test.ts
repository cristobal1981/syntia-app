import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendEmail } from '@/src/modules/email/infrastructure/send-email'

const { send, Resend } = vi.hoisted(() => ({
  send: vi.fn(),
  Resend: vi.fn(),
}))

vi.mock('resend', () => ({ Resend }))

const input = { to: 'ana@example.com', subject: 'Hola', html: '<p>x</p>' }

beforeEach(() => {
  vi.resetAllMocks()
  Resend.mockImplementation(function () {
    return { emails: { send } }
  })
  vi.unstubAllEnvs()
  vi.stubEnv('RESEND_API_KEY', 're_key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'from@syntia.test')
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sendEmail — sin configuración', () => {
  it('devuelve id null y no llama a Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', '')

    await expect(sendEmail(input)).resolves.toEqual({ id: null })
    expect(Resend).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('con required lanza RESEND_NOT_CONFIGURED', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', '')

    await expect(sendEmail(input, { required: true })).rejects.toThrow('RESEND_NOT_CONFIGURED')
    expect(send).not.toHaveBeenCalled()
  })

  it('required:false explícito también devuelve id null', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    await expect(sendEmail(input, { required: false })).resolves.toEqual({ id: null })
  })
})

describe('sendEmail — envío', () => {
  it('usa la API key y el remitente del entorno y mapea los campos', async () => {
    send.mockResolvedValue({ data: { id: 'em_1' }, error: null })

    const result = await sendEmail({ ...input, text: 'plano', replyTo: 'r@syntia.test' })

    expect(result).toEqual({ id: 'em_1' })
    expect(Resend).toHaveBeenCalledWith('re_key')
    expect(send).toHaveBeenCalledWith({
      from: 'from@syntia.test',
      to: 'ana@example.com',
      subject: 'Hola',
      html: '<p>x</p>',
      text: 'plano',
      reply_to: 'r@syntia.test',
    })
  })

  it('omite text y reply_to cuando no se pasan', async () => {
    send.mockResolvedValue({ data: { id: 'em_1' }, error: null })

    await sendEmail(input)

    const payload = send.mock.calls[0][0]
    expect(payload).not.toHaveProperty('text')
    expect(payload).not.toHaveProperty('reply_to')
  })

  it('devuelve id null si Resend no devuelve data', async () => {
    send.mockResolvedValue({ data: null, error: null })
    await expect(sendEmail(input)).resolves.toEqual({ id: null })
  })
})

describe('sendEmail — errores de Resend', () => {
  it('propaga un error genérico tal cual, sin la pista de sandbox', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } })

    const err = await sendEmail(input).catch((e: Error) => e)

    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe('Invalid API key')
  })

  it.each([
    'You can only send testing emails to your own email address',
    'You can only send testing emails to your own email address (a@b.es). Please verify a domain at resend.com/domains',
    'Please VERIFY A DOMAIN to send',
  ])('traduce el error de sandbox "%s" añadiendo la pista accionable', async (message) => {
    send.mockResolvedValue({ data: null, error: { message } })

    const err = (await sendEmail(input).catch((e: Error) => e)) as Error

    expect(err.message.startsWith(message)).toBe(true)
    expect(err.message).toContain('RESEND_INVITE_OVERRIDE_TO')
  })

  it.each([
    'Rate limit exceeded: only send 2 requests per second',
    'Invalid recipient for testing purposes',
    'The from address does not match a verified sender',
    'You can Only Send to yourself',
  ])('REGRESIÓN: %j no se confunde con el error de sandbox (sin pista falsa)', async (message) => {
    send.mockResolvedValue({ data: null, error: { message } })

    const err = (await sendEmail(input).catch((e: Error) => e)) as Error

    expect(err.message).toBe(message)
    expect(err.message).not.toContain('RESEND_INVITE_OVERRIDE_TO')
  })

  it('no loguea [email sent] cuando falla', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'x' } })
    await sendEmail(input).catch(() => {})
    expect(console.info).not.toHaveBeenCalled()
  })
})

describe('sendEmail — log', () => {
  it('loguea fuera de producción y calla en producción', async () => {
    send.mockResolvedValue({ data: { id: 'em_1' }, error: null })

    vi.stubEnv('NODE_ENV', 'development')
    await sendEmail(input)
    expect(console.info).toHaveBeenCalledTimes(1)

    vi.stubEnv('NODE_ENV', 'production')
    await sendEmail(input)
    expect(console.info).toHaveBeenCalledTimes(1)
  })
})
