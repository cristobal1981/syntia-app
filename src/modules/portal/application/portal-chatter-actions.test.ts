import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import {
  listRecordMessagesAction,
  postRecordMessageAction,
} from '@/src/modules/portal/application/portal-chatter-actions'

const priorityRuns = vi.hoisted(() => ({ count: 0 }))

const {
  getSession,
  getAllowedSectionsForWorker,
  getWorkerWriteSections,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  verifyClientRecordAccess,
  listPortalMessagesPage,
  postRecordComment,
  fetchChatterReplyLinks,
  checkRateLimit,
  getCachedTramitesSnapshot,
  resolveTaskWorkerSection,
} = vi.hoisted(() => ({
  getCachedTramitesSnapshot: vi.fn(),
  resolveTaskWorkerSection: vi.fn(),
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  listPortalMessagesPage: vi.fn(),
  postRecordComment: vi.fn(),
  fetchChatterReplyLinks: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/rate-limit/check-rate-limit', () => ({ checkRateLimit }))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
  resolveOdooErrorCode: () => 'odoo_unavailable',
  runWithOdooPriority: <T>(task: () => Promise<T>) => {
    priorityRuns.count += 1
    return task()
  },
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  verifyClientRecordAccess,
  resolveTaskWorkerSection,
  getOdooModelForRecordKind: () => 'project.task',
  canClientReplyOnRecord: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  listPortalMessagesPage,
  listNewerPortalMessages: vi.fn(),
  postRecordComment,
  verifyParentMessageBelongsToRecord: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  createAttachmentsForRecord: vi.fn().mockResolvedValue([]),
  countAttachmentsByRecordIds: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: (partnerId: number) => `tramites-snapshot:${partnerId}`,
  chatterUnreadBatchCacheTag: (partnerId: number) => `chatter-unread-batch:${partnerId}`,
  forgetRecentTramitesLoad: () => undefined,
  getCachedTramitesSnapshot,
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
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))

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
  checkRateLimit.mockResolvedValue(true)
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

  it('resuelve el actor una sola vez y se lo pasa al resolutor del partner', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })

    await listRecordMessagesAction({ kind: 'task', recordId: 1 })

    expect(resolveDirectoryActorId).toHaveBeenCalledTimes(1)
    expect(resolveClientOdooPartnerId).toHaveBeenCalledWith(expect.anything(), 'actor-1')
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
    resolveTaskWorkerSection.mockResolvedValue('/tramites')
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

describe('postRecordMessageAction (/tramites write gate for colaboradores)', () => {
  it('refuses a worker who only has "read" on /tramites — view-only cannot post', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set())

    const result = await postRecordMessageAction({
      kind: 'task',
      recordId: 1,
      body: '<p>hola</p>',
    })

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(postRecordComment).not.toHaveBeenCalled()
    expect(verifyClientRecordAccess).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted at "write" level post a message', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))
    verifyClientRecordAccess.mockResolvedValue(true)
    resolveTaskWorkerSection.mockResolvedValue('/tramites')
    postRecordComment.mockResolvedValue({
      id: 10,
      bodyHtml: '<p>hola</p>',
      date: '2026-08-31',
      authorName: 'Worker',
      isFromClient: true,
    })

    const result = await postRecordMessageAction({
      kind: 'task',
      recordId: 1,
      body: '<p>hola</p>',
    })

    expect(result).toMatchObject({ ok: true })
    expect(postRecordComment).toHaveBeenCalled()
  })

  it('never write-section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    postRecordComment.mockResolvedValue({
      id: 10,
      bodyHtml: '<p>hola</p>',
      date: '2026-08-31',
      authorName: 'Client',
      isFromClient: true,
    })

    const result = await postRecordMessageAction({
      kind: 'task',
      recordId: 1,
      body: '<p>hola</p>',
    })

    expect(result).toMatchObject({ ok: true })
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})

describe('postRecordMessageAction (rate limiting)', () => {
  it('rechaza con rate_limited sin tocar Odoo cuando se supera el límite', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    checkRateLimit.mockResolvedValue(false)

    const result = await postRecordMessageAction({
      kind: 'task',
      recordId: 1,
      body: '<p>hola</p>',
    })

    expect(result).toEqual({ ok: false, error: 'rate_limited' })
    expect(verifyClientRecordAccess).not.toHaveBeenCalled()
    expect(postRecordComment).not.toHaveBeenCalled()
  })
})

describe('postRecordMessageAction (a quién se avisa por correo)', () => {
  const saved = {
    id: 10,
    bodyHtml: '<p>hola</p>',
    date: '2026-08-31',
    authorName: 'Client',
    isFromClient: true,
  }

  function ready() {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    postRecordComment.mockResolvedValue(saved)
  }

  const post = (notifyPartnerIds: number[], kind: 'task' | 'ticket' = 'task') =>
    postRecordMessageAction({ kind, recordId: 5, body: '<p>hola</p>', notifyPartnerIds })

  it('solo avisa a los responsables reales del registro, aunque el navegador pida a otros contactos', async () => {
    ready()
    getCachedTramitesSnapshot.mockResolvedValue({
      tasks: [{ id: 5, assignedNotifyPartnerIds: [701, 902] }],
      tickets: [],
    })

    await post([701, 4242, 902])

    expect(postRecordComment).toHaveBeenCalledWith(
      expect.objectContaining({ notifyPartnerIds: [701, 902] })
    )
  })

  it('un contacto ajeno (otro cliente) pedido desde el navegador no recibe nada', async () => {
    ready()
    getCachedTramitesSnapshot.mockResolvedValue({
      tasks: [{ id: 5, assignedNotifyPartnerIds: [701] }],
      tickets: [],
    })

    await post([555])

    expect(postRecordComment).toHaveBeenCalledWith(expect.objectContaining({ notifyPartnerIds: [] }))
  })

  it('en una consulta usa los responsables del ticket, no los de una tarea con el mismo id', async () => {
    ready()
    getCachedTramitesSnapshot.mockResolvedValue({
      tasks: [{ id: 5, assignedNotifyPartnerIds: [111] }],
      tickets: [{ id: 5, assignedNotifyPartnerIds: [222] }],
    })

    await post([111, 222], 'ticket')

    expect(postRecordComment).toHaveBeenCalledWith(
      expect.objectContaining({ notifyPartnerIds: [222] })
    )
  })

  it('si el registro no está en el snapshot, nadie', async () => {
    ready()
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })

    await post([701])

    expect(postRecordComment).toHaveBeenCalledWith(expect.objectContaining({ notifyPartnerIds: [] }))
  })

  it('si el snapshot falla, el mensaje se publica igualmente y sin avisos por correo', async () => {
    ready()
    getCachedTramitesSnapshot.mockRejectedValue(new Error('ODOO_REQUEST_FAILED'))

    const result = await post([701])

    expect(result).toMatchObject({ ok: true })
    expect(postRecordComment).toHaveBeenCalledWith(expect.objectContaining({ notifyPartnerIds: [] }))
  })

  it('si el snapshot tarda demasiado, no retrasa el mensaje: se publica sin avisos por correo', async () => {
    vi.useFakeTimers()
    try {
      ready()
      getCachedTramitesSnapshot.mockReturnValue(new Promise(() => {}))

      const pending = post([701])
      await vi.advanceTimersByTimeAsync(1500)
      const result = await pending

      expect(result).toMatchObject({ ok: true })
      expect(postRecordComment).toHaveBeenCalledWith(
        expect.objectContaining({ notifyPartnerIds: [] })
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('sin contactos pedidos no consulta el snapshot', async () => {
    ready()

    await post([])

    expect(getCachedTramitesSnapshot).not.toHaveBeenCalled()
    expect(postRecordComment).toHaveBeenCalledWith(expect.objectContaining({ notifyPartnerIds: [] }))
  })
})

describe('portal-chatter-actions (sección del registro para colaboradores)', () => {
  function worker(sections: string[]) {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(sections))
    verifyClientRecordAccess.mockResolvedValue(true)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })
  }

  it('con solo /tramites no lee el chat de una obligación (tarea de la sección /obligaciones)', async () => {
    worker(['/tramites'])
    resolveTaskWorkerSection.mockResolvedValue('/obligaciones')

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 7 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('con solo /obligaciones lee el chat de una obligación', async () => {
    worker(['/obligaciones'])
    resolveTaskWorkerSection.mockResolvedValue('/obligaciones')

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 7 })

    expect(result).toMatchObject({ ok: true })
  })

  it('con solo /obligaciones no lee un trámite ni una consulta', async () => {
    worker(['/obligaciones'])
    resolveTaskWorkerSection.mockResolvedValue('/tramites')

    expect(await listRecordMessagesAction({ kind: 'task', recordId: 7 })).toMatchObject({
      ok: false,
      error: 'not_found',
    })
    expect(await listRecordMessagesAction({ kind: 'ticket', recordId: 8 })).toMatchObject({
      ok: false,
      error: 'not_found',
    })
  })

  it('un registro que no está en ninguna lista del cliente no se lee con una sola sección', async () => {
    worker(['/tramites'])
    resolveTaskWorkerSection.mockResolvedValue(null)

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 7 })

    expect(result).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('con las dos secciones no hace falta mirar a cuál pertenece', async () => {
    worker(['/tramites', '/obligaciones'])

    const result = await listRecordMessagesAction({ kind: 'task', recordId: 7 })

    expect(result).toMatchObject({ ok: true })
    expect(resolveTaskWorkerSection).not.toHaveBeenCalled()
  })

  it('el titular nunca consulta la sección', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    verifyClientRecordAccess.mockResolvedValue(true)
    listPortalMessagesPage.mockResolvedValue({ messages: [], hasMore: false })

    await listRecordMessagesAction({ kind: 'task', recordId: 7 })

    expect(resolveTaskWorkerSection).not.toHaveBeenCalled()
  })
})
