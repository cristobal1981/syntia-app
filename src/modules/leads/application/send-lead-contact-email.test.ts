import { describe, expect, it, vi, beforeEach } from 'vitest'

import { sendLeadContactEmailAction } from '@/src/modules/leads/application/send-lead-contact-email'
import type { LeadRecord } from '@/src/modules/leads/domain/types'

const {
  getSession,
  getLeadById,
  sendEmail,
  recordLeadContact,
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
  buildLeadContactEmail,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getLeadById: vi.fn(),
  sendEmail: vi.fn(),
  recordLeadContact: vi.fn(),
  getInviteRecipientEmail: vi.fn((email: string) => email),
  isInviteRecipientOverridden: vi.fn(() => false),
  buildLeadContactEmail: vi.fn(() => ({
    subject: 'Asunto final',
    html: '<p>html</p>',
    text: 'texto',
  })),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/leads/infrastructure/leads.supabase', () => ({ getLeadById }))
vi.mock('@/src/modules/leads/infrastructure/lead-contacts.supabase', () => ({
  recordLeadContact,
}))
vi.mock('@/src/modules/email/infrastructure/send-email', () => ({ sendEmail }))
vi.mock('@/src/modules/email/infrastructure/resend-env', () => ({
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
}))
vi.mock('@/content/lead-contact-email', () => ({ buildLeadContactEmail }))

function session(role: 'admin' | 'advisor' | 'client' | 'worker' = 'admin') {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100_000,
  }
}

function leadRecord(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: 'lead-1',
    odooPartnerId: null,
    nombre: 'Ana García',
    email: 'ana@example.com',
    telefono: null,
    tipo: 'ALTA',
    residencia: 'Peninsula',
    facturacionEstimada: 15_000,
    codigoCuota: 'TRAMO_50',
    totalMensual: 100,
    estado: 'rechazado',
    motivo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  getInviteRecipientEmail.mockImplementation((email: string) => email)
  isInviteRecipientOverridden.mockReturnValue(false)
  buildLeadContactEmail.mockReturnValue({
    subject: 'Asunto final',
    html: '<p>html</p>',
    text: 'texto',
  })
})

describe('sendLeadContactEmailAction — control de acceso', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'bloquea a role=%s sin tocar el lead ni enviar nada',
    async (role) => {
      getSession.mockResolvedValue(session(role))

      const result = await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(getLeadById).not.toHaveBeenCalled()
      expect(sendEmail).not.toHaveBeenCalled()
    }
  )

  it('bloquea sin sesión', async () => {
    getSession.mockResolvedValue(null)

    const result = await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getLeadById).not.toHaveBeenCalled()
  })
})

describe('sendLeadContactEmailAction — validación', () => {
  it('rechaza asunto o cuerpo vacíos sin buscar el lead', async () => {
    getSession.mockResolvedValue(session('admin'))

    const result = await sendLeadContactEmailAction('lead-1', '   ', 'Cuerpo')

    expect(result.ok).toBe(false)
    expect(getLeadById).not.toHaveBeenCalled()
  })
})

describe('sendLeadContactEmailAction — lead', () => {
  it('devuelve not_found si el lead no existe', async () => {
    getSession.mockResolvedValue(session('admin'))
    getLeadById.mockResolvedValue(null)

    const result = await sendLeadContactEmailAction('missing', 'Asunto', 'Cuerpo')

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('devuelve no_email si el lead no tiene email', async () => {
    getSession.mockResolvedValue(session('admin'))
    getLeadById.mockResolvedValue(leadRecord({ email: null }))

    const result = await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

    expect(result).toEqual({ ok: false, error: 'no_email' })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('sendLeadContactEmailAction — envío', () => {
  it('envía a to=email del lead con replyTo=email de quien envía, y registra el contacto', async () => {
    getSession.mockResolvedValue(session('admin'))
    getLeadById.mockResolvedValue(leadRecord({ email: 'ana@example.com' }))
    sendEmail.mockResolvedValue({ id: 'resend-123' })

    const result = await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

    expect(result).toEqual({ ok: true })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        replyTo: 'admin@example.com',
        subject: 'Asunto final',
      }),
      { required: true }
    )
    expect(recordLeadContact).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        sentBy: 'auth-admin',
        sentTo: 'ana@example.com',
        resendEmailId: 'resend-123',
      })
    )
  })

  it('usa el override de destinatario de Resend cuando está activo (no cuela un email real en dev)', async () => {
    getSession.mockResolvedValue(session('admin'))
    getLeadById.mockResolvedValue(leadRecord({ email: 'ana@example.com' }))
    getInviteRecipientEmail.mockReturnValue('sandbox@example.com')
    isInviteRecipientOverridden.mockReturnValue(true)
    sendEmail.mockResolvedValue({ id: null })

    await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'sandbox@example.com' }),
      { required: true }
    )
    expect(buildLeadContactEmail).toHaveBeenCalledWith(
      expect.objectContaining({ isOverrideRecipient: true })
    )
  })

  it('si sendEmail falla, NO registra un contacto fantasma y propaga el error', async () => {
    getSession.mockResolvedValue(session('admin'))
    getLeadById.mockResolvedValue(leadRecord())
    sendEmail.mockRejectedValue(new Error('RESEND_NOT_CONFIGURED'))

    const result = await sendLeadContactEmailAction('lead-1', 'Asunto', 'Cuerpo')

    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message: 'RESEND_NOT_CONFIGURED',
    })
    expect(recordLeadContact).not.toHaveBeenCalled()
  })
})
