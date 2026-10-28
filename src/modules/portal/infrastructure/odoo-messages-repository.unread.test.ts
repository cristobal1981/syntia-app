import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead, batchLimit } = vi.hoisted(() => ({
  odooSearchRead: vi.fn(),
  batchLimit: { value: 300 },
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  odooSearchRead,
  odooCall: vi.fn(),
  mapOdooMany2OneId: (value: unknown) =>
    Array.isArray(value) && typeof value[0] === 'number' ? value[0] : undefined,
  mapOdooMany2OneLabel: (value: unknown) =>
    Array.isArray(value) && typeof value[1] === 'string' ? value[1] : undefined,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-chatter-env', () => ({
  getChatterExcludedPartnerIds: () => [],
  getChatterNotificationsBatchLimit: () => batchLimit.value,
  getChatterPageSize: () => 20,
  shouldFilterInternalChatterMessages: () => false,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-chatter-subtype', () => ({
  resolveChatterCommentSubtypeId: vi.fn(),
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  resolveAttachmentMetaByIds: vi.fn(),
}))

import { findUnreadChatterCandidatesForRecords } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { chatterReadStateKey } from '@/src/modules/portal/domain/portal-notifications-types'

const CLIENT = 1233
const GESTOR = 77

type Msg = {
  id: number
  res_id: number
  author: number
  body?: string
  attachment_ids?: number[]
}

/** Falso de `mail.message`: aplica el dominio, el orden, el límite y solo devuelve los campos pedidos. */
function installOdoo(messages: Msg[]) {
  odooSearchRead.mockImplementation(
    async (
      _model: string,
      args: { domain: unknown[][]; fields: string[]; limit: number }
    ) => {
      const resIds = args.domain.find((term) => term[0] === 'res_id')![2] as number[]
      const after = args.domain.find((term) => term[0] === 'id' && term[1] === '>')?.[2] as
        | number
        | undefined
      const before = args.domain.find((term) => term[0] === 'id' && term[1] === '<')?.[2] as
        | number
        | undefined
      return messages
        .filter(
          (message) =>
            resIds.includes(message.res_id) &&
            (after === undefined || message.id > after) &&
            (before === undefined || message.id < before)
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, args.limit)
        .map((message) => {
          const full: Record<string, unknown> = {
            id: message.id,
            res_id: message.res_id,
            body: message.body ?? '<p>Hola</p>',
            date: '2026-10-28 10:00:00',
            author_id: [message.author, 'Autor'],
            message_type: 'comment',
            attachment_ids: message.attachment_ids ?? [],
          }
          return Object.fromEntries(Object.entries(full).filter(([key]) => args.fields.includes(key)))
        })
    }
  )
}

const group = (ids: number[]) => [
  {
    resModel: 'project.task',
    recordKind: 'task' as const,
    records: ids.map((recordId) => ({ recordId })),
  },
]
const state = (entries: Array<[number, number]>) =>
  new Map(entries.map(([recordId, seen]) => [chatterReadStateKey('task', recordId), seen]))

function find(ids: number[], readState: Map<string, number>) {
  return findUnreadChatterCandidatesForRecords({
    groups: group(ids),
    readState,
    clientPartnerId: CLIENT,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  batchLimit.value = 300
})

describe('findUnreadChatterCandidatesForRecords', () => {
  it('con todos los registros con «visto», una sola petición acotada por el id más bajo', async () => {
    installOdoo([
      { id: 10, res_id: 1, author: GESTOR },
      { id: 20, res_id: 2, author: GESTOR },
    ])

    const result = await find([1, 2], state([[1, 5], [2, 15]]))

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    const args = odooSearchRead.mock.calls[0]![1]
    expect(args.domain).toContainEqual(['id', '>', 5])
    expect(args.domain.some((term: unknown[]) => term[1] === '<')).toBe(false)
    expect(result.unread.map((entry) => entry.recordId).sort()).toEqual([1, 2])
    expect(result.unread.find((entry) => entry.recordId === 1)!.latestMessageId).toBe(10)
  })

  it('un mensaje del gestor que solo trae adjuntos (sin texto) cuenta como sin leer', async () => {
    installOdoo([{ id: 10, res_id: 1, author: GESTOR, body: '', attachment_ids: [99] }])

    const result = await find([1], state([[1, 5]]))

    expect(odooSearchRead.mock.calls[0]![1].fields).toContain('attachment_ids')
    expect(result.unread).toEqual([expect.objectContaining({ recordId: 1, latestMessageId: 10 })])
  })

  it('un mensaje vacío y sin adjuntos no cuenta; uno del propio cliente tampoco', async () => {
    installOdoo([
      { id: 10, res_id: 1, author: GESTOR, body: '' },
      { id: 11, res_id: 1, author: CLIENT },
    ])

    expect((await find([1], state([[1, 5]]))).unread).toEqual([])
  })

  it('con un registro sin «visto» no acota por id: su mensaje antiguo del gestor se ve y se ancla justo antes', async () => {
    installOdoo([
      { id: 3, res_id: 2, author: GESTOR },
      { id: 50, res_id: 1, author: CLIENT },
    ])

    const result = await find([1, 2], state([[1, 40]]))

    const args = odooSearchRead.mock.calls[0]![1]
    expect(args.domain.some((term: unknown[]) => term[0] === 'id')).toBe(false)
    expect(result.unread).toEqual([expect.objectContaining({ recordId: 2, latestMessageId: 3 })])
    expect(result.bootstrapUpdates).toContainEqual({
      recordKind: 'task',
      recordId: 2,
      lastSeenMessageId: 2,
    })
  })

  it('un registro sin «visto» cuyo último mensaje es del cliente se ancla al final y no avisa', async () => {
    installOdoo([{ id: 8, res_id: 1, author: CLIENT }])

    const result = await find([1], new Map())

    expect(result.unread).toEqual([])
    expect(result.bootstrapUpdates).toEqual([
      { recordKind: 'task', recordId: 1, lastSeenMessageId: 8 },
    ])
  })

  describe('cuando el límite de filas corta la lectura', () => {
    beforeEach(() => {
      batchLimit.value = 3
    })

    it('un registro con mucho movimiento no tapa al tranquilo: se pide aparte por debajo del corte', async () => {
      installOdoo([
        { id: 100, res_id: 1, author: GESTOR },
        { id: 101, res_id: 1, author: GESTOR },
        { id: 102, res_id: 1, author: GESTOR },
        { id: 50, res_id: 2, author: GESTOR },
      ])

      const result = await find([1, 2], state([[1, 98], [2, 10]]))

      expect(odooSearchRead).toHaveBeenCalledTimes(2)
      const second = odooSearchRead.mock.calls[1]![1].domain as unknown[][]
      expect(second.find((term) => term[0] === 'res_id')![2]).toEqual([2])
      expect(second).toContainEqual(['id', '<', 100])
      expect(second).toContainEqual(['id', '>', 10])
      expect(result.unread).toHaveLength(2)
      expect(result.unread).toContainEqual(expect.objectContaining({ recordId: 1, latestMessageId: 102 }))
      expect(result.unread).toContainEqual(expect.objectContaining({ recordId: 2, latestMessageId: 50 }))
    })

    it('un «visto» a pocos ids del corte no basta: lo que cae entre medias se sigue buscando', async () => {
      installOdoo([
        { id: 100, res_id: 1, author: CLIENT },
        { id: 101, res_id: 1, author: CLIENT },
        { id: 102, res_id: 1, author: CLIENT },
        { id: 98, res_id: 2, author: GESTOR },
      ])

      const result = await find([1, 2], state([[1, 99], [2, 97]]))

      expect(odooSearchRead).toHaveBeenCalledTimes(2)
      expect(result.unread).toEqual([expect.objectContaining({ recordId: 2, latestMessageId: 98 })])
    })

    it('un mensaje del gestor invisible (sin texto ni adjuntos) dentro de lo recibido no resuelve al registro', async () => {
      installOdoo([
        { id: 100, res_id: 2, author: GESTOR, body: '' },
        { id: 101, res_id: 2, author: GESTOR, body: '' },
        { id: 102, res_id: 2, author: GESTOR, body: '' },
        { id: 50, res_id: 2, author: GESTOR },
      ])

      const result = await find([2], state([[2, 10]]))

      expect(odooSearchRead).toHaveBeenCalledTimes(2)
      expect(result.unread).toEqual([expect.objectContaining({ recordId: 2, latestMessageId: 50 })])
    })

    it('lo ya resuelto no se vuelve a pedir: sin «visto» pendiente por debajo del corte o con su gestor ya visto', async () => {
      installOdoo([
        { id: 100, res_id: 1, author: GESTOR },
        { id: 101, res_id: 1, author: CLIENT },
        { id: 102, res_id: 1, author: CLIENT },
        { id: 50, res_id: 2, author: GESTOR },
        { id: 60, res_id: 3, author: GESTOR },
      ])

      // 1: su gestor está dentro de lo recibido. 3: su «visto» (150) está por encima del corte.
      await find([1, 2, 3], state([[1, 5], [2, 10], [3, 150]]))

      const second = odooSearchRead.mock.calls[1]![1].domain as unknown[][]
      expect(second.find((term) => term[0] === 'res_id')![2]).toEqual([2])
    })

    it('si todo queda resuelto con la primera petición no hace una segunda', async () => {
      installOdoo([
        { id: 100, res_id: 1, author: GESTOR },
        { id: 101, res_id: 2, author: GESTOR },
        { id: 102, res_id: 3, author: GESTOR },
      ])

      await find([1, 2, 3], state([[1, 5], [2, 5], [3, 5]]))

      expect(odooSearchRead).toHaveBeenCalledTimes(1)
    })

    it('un registro sin «visto» y sin gestor dentro de lo recibido se sigue buscando hacia atrás', async () => {
      installOdoo([
        { id: 100, res_id: 1, author: CLIENT },
        { id: 101, res_id: 1, author: CLIENT },
        { id: 102, res_id: 1, author: CLIENT },
        { id: 5, res_id: 1, author: GESTOR },
      ])

      const result = await find([1], new Map())

      expect(odooSearchRead).toHaveBeenCalledTimes(2)
      expect(result.unread).toEqual([expect.objectContaining({ recordId: 1, latestMessageId: 5 })])
    })

    it('nunca pasa de 5 rondas por grupo', async () => {
      installOdoo(
        Array.from({ length: 40 }, (_, index) => ({
          id: 200 - index,
          res_id: 1,
          author: CLIENT,
        }))
      )

      await find([1], state([[1, 1]]))

      expect(odooSearchRead).toHaveBeenCalledTimes(5)
    })
  })
})
