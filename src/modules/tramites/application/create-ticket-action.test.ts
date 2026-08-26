import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createTicketAction } from '@/src/modules/tramites/application/create-ticket-action'

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  createPartnerTicket,
  postRecordComment,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTicket: vi.fn(),
  postRecordComment: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
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
}))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  createPartnerTicket.mockResolvedValue(42)
  postRecordComment.mockResolvedValue({})
})

describe('createTicketAction (/tramites section gate for colaboradores)', () => {
  it('refuses a worker without /tramites granted before ever hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTicket).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted create the ticket', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: true })
    expect(createPartnerTicket).toHaveBeenCalled()
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createTicketAction({ subject: 'hola', body: '<p>cuerpo</p>' })

    expect(result).toMatchObject({ ok: true })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })
})
