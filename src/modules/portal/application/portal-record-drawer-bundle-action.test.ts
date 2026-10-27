import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { getRecordDrawerBundleAction } from '@/src/modules/portal/application/portal-chatter-actions'

const priorityRuns = vi.hoisted(() => ({ count: 0 }))

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  verifyClientRecordAccess,
  listPortalMessagesPage,
  fetchChatterReplyLinks,
  fetchTramiteDescription,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  listPortalMessagesPage: vi.fn(),
  fetchChatterReplyLinks: vi.fn(),
  fetchTramiteDescription: vi.fn(),
}))

vi.mock('@/lib/rate-limit/check-rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections: vi.fn(),
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
  getOdooModelForRecordKind: (kind: string) => (kind === 'task' ? 'project.task' : 'helpdesk.ticket'),
  canClientReplyOnRecord: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  listPortalMessagesPage,
  listNewerPortalMessages: vi.fn(),
  postRecordComment: vi.fn(),
  verifyParentMessageBelongsToRecord: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  createAttachmentsForRecord: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: (partnerId: number) => `tramites-snapshot:${partnerId}`,
  chatterUnreadBatchCacheTag: (partnerId: number) => `chatter-unread-batch:${partnerId}`,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-chatter-reply-links.supabase', () => ({
  fetchChatterReplyLinks,
  recordChatterReplyLink: vi.fn(),
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-tramite-description-repository', () => ({
  fetchTramiteDescription,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId: vi.fn().mockResolvedValue('actor-1'),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), updateTag: vi.fn() }))

const clientSession: PortalSession = {
  user: { id: 'u-client', email: 'c@example.com', name: 'c', role: 'client' },
  expiresAt: Date.now() + 100_000,
}

const message = { id: 7, bodyHtml: '<p>hola</p>', date: '2026-10-26T10:00:00Z', authorName: 'Ana', isFromClient: false }

beforeEach(() => {
  vi.resetAllMocks()
  priorityRuns.count = 0
  getSession.mockResolvedValue(clientSession)
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  verifyClientRecordAccess.mockResolvedValue(true)
  listPortalMessagesPage.mockResolvedValue({ messages: [message], hasMore: true })
  fetchChatterReplyLinks.mockResolvedValue(new Map())
  fetchTramiteDescription.mockResolvedValue('<p>Descripción</p>')
})

describe('getRecordDrawerBundleAction', () => {
  it('lee de Odoo con prioridad: el chat que se abre no espera detrás de las peticiones de fondo', async () => {
    await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(priorityRuns.count).toBe(1)
  })

  it('devuelve mensajes y descripción de un trámite en una sola respuesta, con un solo permiso', async () => {
    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toEqual({
      ok: true,
      messages: [message],
      hasMore: true,
      description: '<p>Descripción</p>',
    })
    expect(verifyClientRecordAccess).toHaveBeenCalledTimes(1)
    expect(verifyClientRecordAccess).toHaveBeenCalledWith('task', 5, 999)
    expect(listPortalMessagesPage).toHaveBeenCalledTimes(1)
    expect(fetchTramiteDescription).toHaveBeenCalledWith(5)
  })

  it('una consulta (ticket) no pide descripción', async () => {
    const result = await getRecordDrawerBundleAction({ kind: 'ticket', recordId: 5 })

    expect(result).toMatchObject({ ok: true, description: null })
    expect(fetchTramiteDescription).not.toHaveBeenCalled()
  })

  it('si la descripción falla, los mensajes siguen llegando', async () => {
    fetchTramiteDescription.mockRejectedValue(new Error('boom'))

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toMatchObject({ ok: true, messages: [message], description: null })
  })

  it('no devuelve nada si el registro no es del cliente', async () => {
    verifyClientRecordAccess.mockResolvedValue(false)

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('sin sesión responde forbidden y no consulta nada', async () => {
    getSession.mockResolvedValue(null)

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listPortalMessagesPage).not.toHaveBeenCalled()
    expect(fetchTramiteDescription).not.toHaveBeenCalled()
  })

  it('un id inválido no llega a Odoo', async () => {
    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 0 })

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(listPortalMessagesPage).not.toHaveBeenCalled()
  })

  it('un colaborador sin /tramites recibe forbidden', async () => {
    getSession.mockResolvedValue({
      user: { id: 'u-w', email: 'w@example.com', name: 'w', role: 'worker' },
      expiresAt: Date.now() + 100_000,
    })
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listPortalMessagesPage).not.toHaveBeenCalled()
  })

  it('un fallo de Odoo se traduce a error de servicio', async () => {
    listPortalMessagesPage.mockRejectedValue(new Error('ODOO_REQUEST_FAILED'))

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('sustituye el parent_id de Odoo por el vínculo de respuesta guardado', async () => {
    listPortalMessagesPage.mockResolvedValue({
      messages: [{ ...message, parentId: 3 }],
      hasMore: false,
    })
    fetchChatterReplyLinks.mockResolvedValue(new Map([[7, 4]]))

    const result = await getRecordDrawerBundleAction({ kind: 'task', recordId: 5 })

    expect(result).toMatchObject({ ok: true, messages: [{ id: 7, parentId: 4 }] })
  })
})
