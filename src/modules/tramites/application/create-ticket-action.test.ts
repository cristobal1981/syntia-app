import { describe, expect, it, vi, beforeEach } from 'vitest'
import { revalidateTag, updateTag } from 'next/cache'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createTicketAction } from '@/src/modules/tramites/application/create-ticket-action'

const {
  getSession,
  getWorkerWriteSections,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  createPartnerTicket,
  postRecordComment,
  checkRateLimit,
  forgetRecentTramitesLoad,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTicket: vi.fn(),
  postRecordComment: vi.fn(),
  checkRateLimit: vi.fn(),
  forgetRecentTramitesLoad: vi.fn(),
}))

vi.mock('@/lib/rate-limit/check-rate-limit', () => ({ checkRateLimit }))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-create-ticket-repository', () => ({
  createPartnerTicket,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  postRecordComment,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  getOdooModelForRecordKind: () => 'helpdesk.ticket',
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: () => 'tag',
  forgetRecentTramitesLoad,
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  createPartnerTicket.mockResolvedValue(42)
  postRecordComment.mockResolvedValue({})
  checkRateLimit.mockResolvedValue(true)
})

describe('createTicketAction (/tramites section gate for colaboradores)', () => {
  it('refuses a worker without /tramites in write before ever hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('refuses a worker with /tramites only at "read" level (view-only cannot create)', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set())

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted at "write" level create the ticket', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: true })
    expect(createPartnerTicket).toHaveBeenCalled()
  })

  it('expira el snapshot de trámites al instante (updateTag, no revalidateTag stale)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: true })
    expect(updateTag).toHaveBeenCalledWith('tag')
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('olvida la última carga reutilizable del snapshot al crear, para que lo nuevo aparezca al instante', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(forgetRecentTramitesLoad).toHaveBeenCalledWith(999)
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: true })
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})

describe('createTicketAction (rate limiting)', () => {
  it('rechaza con rate_limited sin tocar Odoo cuando se supera el límite', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    checkRateLimit.mockResolvedValue(false)

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toEqual({ ok: false, error: 'rate_limited' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('usa una clave por usuario, no global', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('u-client'),
      expect.objectContaining({ limit: expect.any(Number), windowSeconds: expect.any(Number) })
    )
  })
})

describe('createTicketAction (sesión y precondiciones)', () => {
  const input = { subject: 'hola', body: '<p>cuerpo</p>' }

  it('sin sesión: forbidden sin rate limit', async () => {
    getSession.mockResolvedValue(null)
    expect(await createTicketAction(input)).toEqual({ ok: false, error: 'forbidden' })
    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('rol admin: forbidden', async () => {
    getSession.mockResolvedValue({
      user: { id: 'a', email: 'a@b.c', name: 'a', role: 'admin' },
      expiresAt: Date.now() + 1000,
    })
    expect(await createTicketAction(input)).toEqual({ ok: false, error: 'forbidden' })
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('el rate limit usa clave create-ticket:<id> con 5 por 300 s', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    await createTicketAction(input)
    expect(checkRateLimit).toHaveBeenCalledWith('create-ticket:u-client', {
      limit: 5,
      windowSeconds: 300,
    })
  })

  it('sin partner: not_linked', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    resolveClientOdooPartnerId.mockResolvedValue(null)
    expect(await createTicketAction(input)).toEqual({ ok: false, error: 'not_linked' })
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('Odoo sin configurar: odoo_unavailable', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    isOdooApiConfigured.mockReturnValue(false)
    expect(await createTicketAction(input)).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })
})

describe('createTicketAction (validación)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('asunto vacío o solo espacios: subjectRequired', async () => {
    const r = await createTicketAction({ subject: '   ', body: '<p>x</p>' })
    expect(r).toEqual({ ok: false, error: 'validation', fieldErrors: { subject: 'subjectRequired' } })
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('asunto: 120 pasa (recortado) y 121 es subjectTooLong', async () => {
    const ok = await createTicketAction({ subject: ` ${'a'.repeat(120)} `, body: '<p>x</p>' })
    expect(ok).toMatchObject({ ok: true, name: 'a'.repeat(120) })
    expect(createPartnerTicket).toHaveBeenCalledWith({ partnerId: 999, subject: 'a'.repeat(120) })

    const bad = await createTicketAction({ subject: 'a'.repeat(121), body: '<p>x</p>' })
    expect(bad).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { subject: 'subjectTooLong' },
    })
  })

  it('cuerpo vacío (solo etiquetas) es bodyRequired; 2000 pasa y 2001 es bodyTooLong', async () => {
    const empty = await createTicketAction({ subject: 'a', body: '<p> </p>' })
    expect(empty).toEqual({ ok: false, error: 'validation', fieldErrors: { body: 'bodyRequired' } })

    const ok = await createTicketAction({ subject: 'a', body: `<p>${'x'.repeat(2000)}</p>` })
    expect(ok).toMatchObject({ ok: true })

    const long = await createTicketAction({ subject: 'a', body: `<p>${'x'.repeat(2001)}</p>` })
    expect(long).toEqual({ ok: false, error: 'validation', fieldErrors: { body: 'bodyTooLong' } })
  })

  it('errores de asunto y cuerpo se devuelven juntos', async () => {
    const r = await createTicketAction({ subject: '', body: '' })
    expect(r).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { subject: 'subjectRequired', body: 'bodyRequired' },
    })
  })
})

describe('createTicketAction (creación y errores)', () => {
  const input = { subject: 'hola', body: '<p>cuerpo</p>' }

  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('crea el ticket y publica el cuerpo como comentario sobre ese ticket', async () => {
    const r = await createTicketAction(input)
    expect(r).toEqual({ ok: true, ticketId: 42, name: 'hola' })
    expect(postRecordComment).toHaveBeenCalledWith({
      resModel: 'helpdesk.ticket',
      recordId: 42,
      clientPartnerId: 999,
      htmlBody: '<p>cuerpo</p>',
    })
  })

  it.each([
    ['ODOO_TICKET_TEAM_NOT_CONFIGURED', 'odoo_unavailable'],
    ['ODOO_TICKET_CREATE_FAILED', 'create_failed'],
    ['otro', 'odoo_unavailable'],
  ])('error %s -> %s sin expirar el snapshot', async (message, expected) => {
    createPartnerTicket.mockRejectedValue(new Error(message))
    expect(await createTicketAction(input)).toEqual({ ok: false, error: expected })
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('fallo al publicar el comentario: error y sin updateTag', async () => {
    postRecordComment.mockRejectedValue(new Error('x'))
    expect(await createTicketAction(input)).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(updateTag).not.toHaveBeenCalled()
  })
})
