import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { listRecordMessagesAction } from '@/src/modules/portal/application/portal-chatter-actions'

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  verifyClientRecordAccess,
  listPortalMessagesPage,
  fetchChatterReplyLinks,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  listPortalMessagesPage: vi.fn(),
  fetchChatterReplyLinks: vi.fn(),
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
  getOdooModelForRecordKind: () => 'project.task',
  canClientReplyOnRecord: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  listPortalMessagesPage,
  listNewerPortalMessages: vi.fn(),
  postRecordComment: vi.fn(),
  verifyParentMessageBelongsToRecord: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/portal-chatter-reply-links.supabase', () => ({
  fetchChatterReplyLinks,
  recordChatterReplyLink: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({
  fetchWatchStateForUser: vi.fn().mockResolvedValue(new Map()),
  upsertWatchStateBatch: vi.fn(),
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId: vi.fn().mockResolvedValue('actor-1'),
}))

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
  fetchChatterReplyLinks.mockResolvedValue(new Map())
})

describe('portal-chatter-actions (/tramites section gate, covers both trámites and tickets/consultas)', () => {
  it('refuses a worker without /tramites granted before ever verifying record access or hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 1 })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(verifyClientRecordAccess).not.toHaveBeenCalled()
    expect(listPortalMessagesPage).not.toHaveBeenCalled()
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
  })

  it('refuses a worker without /tramites even for a "ticket" (consulta) kind record', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await listRecordMessagesAction({ kind: 'ticket', recordId: 1 })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
  })

  it('lets a worker with /tramites granted read messages normally', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))
    verifyClientRecordAccess.mockResolvedValue(true)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 1 })

    expect(result).toMatchObject({ ok: true })
    expect(verifyClientRecordAccess).toHaveBeenCalledWith('task', 1, 999)
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 1 })

    expect(result).toMatchObject({ ok: true })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })

  it('still enforces tenant ownership even for a worker who does have /tramites: a record from another company is rejected', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))
    verifyClientRecordAccess.mockResolvedValue(false)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 555 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })
})
