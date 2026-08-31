import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createProcedureTicketAction } from '@/src/modules/tramites/application/create-procedure-ticket-action'
import type { TrabajadorBajaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const {
  getSession,
  getWorkerWriteSections,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  createPartnerTicket,
  postRecordComment,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTicket: vi.fn(),
  postRecordComment: vi.fn(),
}))

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
  getOdooModelForRecordKind: () => 'project.task',
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: () => 'tag',
}))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

const payload: TrabajadorBajaPayload = {
  type: 'baja-trabajador',
  fullName: 'Ana García',
  dni: '12345678A',
  endDate: '2026-09-01',
  reason: 'Fin de contrato',
  observations: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  createPartnerTicket.mockResolvedValue(7)
  postRecordComment.mockResolvedValue({})
})

describe('createProcedureTicketAction (/tramites section gate for colaboradores)', () => {
  it('refuses a worker without /tramites in write before ever hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted at "write" level create the procedure', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: true })
    expect(createPartnerTicket).toHaveBeenCalled()
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: true })
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})

describe('createProcedureTicketAction (chatter message)', () => {
  it('still posts the resumen as a chatter message for baja-trabajador/carta-vacaciones', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: true })
    expect(postRecordComment).toHaveBeenCalled()
  })
})
