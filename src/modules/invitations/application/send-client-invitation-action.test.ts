import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  checkRateLimit: vi.fn(),
  sendEmail: vi.fn(),
  count: vi.fn(),
  findInviter: vi.fn(),
  accountExists: vi.fn(),
  record: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession: m.getSession }))
vi.mock('@/lib/rate-limit/check-rate-limit', () => ({ checkRateLimit: m.checkRateLimit }))
vi.mock('@/src/modules/email/application/send-client-invitation-email', () => ({
  sendClientInvitationEmail: m.sendEmail,
}))
vi.mock('@/src/modules/invitations/infrastructure/client-invitations.supabase', () => ({
  countInvitationsByInviter: m.count,
  findInviterOfEmail: m.findInviter,
  portalAccountExistsForEmail: m.accountExists,
  recordInvitation: m.record,
  removeInvitation: m.remove,
}))

import { sendClientInvitationAction } from '@/src/modules/invitations/application/send-client-invitation-action'
import { MAX_INVITATIONS_PER_CLIENT } from '@/src/modules/invitations/domain/invitation-rules'

const session = (role = 'client') => ({
  user: { id: 'u-1', email: 'yo@tena.es', name: 'Yo', role },
  expiresAt: Date.now() + 100000,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  m.getSession.mockResolvedValue(session())
  m.checkRateLimit.mockResolvedValue(true)
  m.count.mockResolvedValue(0)
  m.findInviter.mockResolvedValue(null)
  m.accountExists.mockResolvedValue(false)
  m.record.mockResolvedValue(true)
  m.remove.mockResolvedValue(undefined)
  m.sendEmail.mockResolvedValue(undefined)
})

describe('sendClientInvitationAction', () => {
  it('envía la invitación, la registra y devuelve el cupo restante', async () => {
    const result = await sendClientInvitationAction({ email: ' Ana@Ejemplo.com ' })

    expect(result).toEqual({ ok: true, remaining: MAX_INVITATIONS_PER_CLIENT - 1 })
    expect(m.record).toHaveBeenCalledWith({ inviterUserId: 'u-1', inviteeEmail: 'ana@ejemplo.com' })
    expect(m.sendEmail).toHaveBeenCalledWith({ inviteeEmail: 'ana@ejemplo.com' })
  })

  it('registra antes de enviar', async () => {
    const order: string[] = []
    m.record.mockImplementation(async () => {
      order.push('record')
      return true
    })
    m.sendEmail.mockImplementation(async () => {
      order.push('send')
    })

    await sendClientInvitationAction({ email: 'ana@ejemplo.com' })

    expect(order).toEqual(['record', 'send'])
  })

  it.each(['worker', 'advisor', 'admin'])('un %s no puede invitar', async (role) => {
    m.getSession.mockResolvedValue(session(role))

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('sin sesión es forbidden', async () => {
    m.getSession.mockResolvedValue(null)

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'forbidden',
    })
  })

  it('un correo inválido devuelve el error de campo sin tocar nada', async () => {
    const result = await sendClientInvitationAction({ email: 'no-es-correo' })

    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { email: 'invalid' },
    })
    expect(m.checkRateLimit).not.toHaveBeenCalled()
    expect(m.count).not.toHaveBeenCalled()
  })

  it('no deja invitarse a uno mismo', async () => {
    const result = await sendClientInvitationAction({ email: 'YO@tena.es' })

    expect(result).toMatchObject({ ok: false, fieldErrors: { email: 'own_email' } })
  })

  it('con el límite de ráfaga superado responde rate_limited', async () => {
    m.checkRateLimit.mockResolvedValue(false)

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'rate_limited',
    })
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('con el cupo agotado responde limit_reached y no envía', async () => {
    m.count.mockResolvedValue(MAX_INVITATIONS_PER_CLIENT)

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'limit_reached',
    })
    expect(m.record).not.toHaveBeenCalled()
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('con una invitación menos que el máximo todavía deja enviar la última', async () => {
    m.count.mockResolvedValue(MAX_INVITATIONS_PER_CLIENT - 1)

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({ ok: true, remaining: 0 })
  })

  it('si ya invitó a esa persona lo dice', async () => {
    m.findInviter.mockResolvedValue('u-1')

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'already_invited',
    })
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('si la invitó otro cliente responde como enviado sin enviar ni gastar cupo (no revela nada)', async () => {
    m.findInviter.mockResolvedValue('u-otro')
    m.count.mockResolvedValue(2)

    const result = await sendClientInvitationAction({ email: 'a@b.es' })

    expect(result).toEqual({ ok: true, remaining: MAX_INVITATIONS_PER_CLIENT - 2 })
    expect(m.record).not.toHaveBeenCalled()
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('si ya tiene cuenta en el portal responde como enviado sin enviar', async () => {
    m.accountExists.mockResolvedValue(true)

    const result = await sendClientInvitationAction({ email: 'a@b.es' })

    expect(result).toEqual({ ok: true, remaining: MAX_INVITATIONS_PER_CLIENT })
    expect(m.record).not.toHaveBeenCalled()
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('si pierde una carrera de unicidad responde como enviado sin enviar', async () => {
    m.record.mockResolvedValue(false)

    const result = await sendClientInvitationAction({ email: 'a@b.es' })

    expect(result).toEqual({ ok: true, remaining: MAX_INVITATIONS_PER_CLIENT })
    expect(m.sendEmail).not.toHaveBeenCalled()
  })

  it('si el correo no sale deshace el registro y no gasta cupo', async () => {
    m.sendEmail.mockRejectedValue(new Error('resend down'))

    const result = await sendClientInvitationAction({ email: 'a@b.es' })

    expect(result).toEqual({ ok: false, error: 'send_failed' })
    expect(m.remove).toHaveBeenCalledWith('a@b.es')
  })

  it('un fallo al deshacer el registro no tapa el error de envío', async () => {
    m.sendEmail.mockRejectedValue(new Error('resend down'))
    m.remove.mockRejectedValue(new Error('db down'))

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'send_failed',
    })
  })

  it('un fallo de la base de datos responde unavailable y no envía', async () => {
    m.count.mockRejectedValue(new Error('db down'))

    expect(await sendClientInvitationAction({ email: 'a@b.es' })).toEqual({
      ok: false,
      error: 'unavailable',
    })
    expect(m.sendEmail).not.toHaveBeenCalled()
  })
})
