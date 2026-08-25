import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { getRecordAttachmentsAction } from '@/src/modules/portal/application/portal-document-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  verifyClientRecordAccess,
  resolveTaskWorkerSection,
  listAttachmentsForRecord,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  resolveTaskWorkerSection: vi.fn(),
  listAttachmentsForRecord: vi.fn(),
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
  resolveOdooErrorCode: () => 'odoo_unavailable',
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  verifyClientRecordAccess,
  resolveTaskWorkerSection,
  getOdooModelForRecordKind: (kind: string) => (kind === 'task' ? 'project.task' : 'helpdesk.ticket'),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  listAttachmentsForRecord,
  fetchAttachmentBinary: vi.fn(),
}))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

const PARTNER_ID = 999

beforeEach(() => {
  vi.clearAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(PARTNER_ID)
  isOdooApiConfigured.mockReturnValue(true)
  verifyClientRecordAccess.mockResolvedValue(true)
  listAttachmentsForRecord.mockResolvedValue([])
})

describe('portal-document-actions (attachments on trámite/ticket/obligación records)', () => {
  it('a worker with only /obligaciones can read attachments on a task that resolves to /obligaciones', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/obligaciones']))
    resolveTaskWorkerSection.mockResolvedValue('/obligaciones')

    const result = await getRecordAttachmentsAction({ kind: 'task', recordId: 10 })

    expect(result).toMatchObject({ ok: true })
  })

  it('THE KEY CASE: a worker with only /obligaciones is refused on a task that resolves to /tramites, even though ownership checks out', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/obligaciones']))
    resolveTaskWorkerSection.mockResolvedValue('/tramites')
    verifyClientRecordAccess.mockResolvedValue(true) // same-company task, ownership is fine

    const result = await getRecordAttachmentsAction({ kind: 'task', recordId: 11 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
    expect(listAttachmentsForRecord).not.toHaveBeenCalled()
  })

  it('symmetric case: a worker with only /tramites is refused on a task that resolves to /obligaciones', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))
    resolveTaskWorkerSection.mockResolvedValue('/obligaciones')

    const result = await getRecordAttachmentsAction({ kind: 'task', recordId: 12 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('refuses a task that resolves to neither section (defense in depth beyond plain ownership), even with both sections granted', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites', '/obligaciones']))
    resolveTaskWorkerSection.mockResolvedValue(null)

    const result = await getRecordAttachmentsAction({ kind: 'task', recordId: 13 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('a "ticket" (consulta) kind is always /tramites and never consults resolveTaskWorkerSection', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await getRecordAttachmentsAction({ kind: 'ticket', recordId: 14 })

    expect(result).toMatchObject({ ok: true })
    expect(resolveTaskWorkerSection).not.toHaveBeenCalled()
  })

  it('refuses a ticket for a worker without /tramites', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/obligaciones']))

    const result = await getRecordAttachmentsAction({ kind: 'ticket', recordId: 15 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('never section-checks a full client, for either kind', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const taskResult = await getRecordAttachmentsAction({ kind: 'task', recordId: 16 })
    const ticketResult = await getRecordAttachmentsAction({ kind: 'ticket', recordId: 17 })

    expect(taskResult).toMatchObject({ ok: true })
    expect(ticketResult).toMatchObject({ ok: true })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
    expect(resolveTaskWorkerSection).not.toHaveBeenCalled()
  })
})
