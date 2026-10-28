import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRecordDrawerBundleAction, listRecordMessagesAction, listNewerRecordMessagesAction } =
  vi.hoisted(() => ({
    getRecordDrawerBundleAction: vi.fn(),
    listRecordMessagesAction: vi.fn(),
    listNewerRecordMessagesAction: vi.fn(),
  }))

vi.mock('@/src/modules/portal/application/portal-chatter-actions', () => ({
  getRecordDrawerBundleAction,
  listRecordMessagesAction,
  listNewerRecordMessagesAction,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/portal/record-messages/route'

const get = (query: string) =>
  GET(new Request(`http://localhost/api/portal/record-messages?${query}`))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/portal/record-messages', () => {
  it('bundle: pasa tipo e id a la acción y responde sin caché', async () => {
    getRecordDrawerBundleAction.mockResolvedValue({
      ok: true,
      messages: [],
      hasMore: false,
      description: null,
    })

    const response = await get('kind=task&recordId=7&mode=bundle')

    expect(getRecordDrawerBundleAction).toHaveBeenCalledWith({
      kind: 'task',
      recordId: 7,
    })
    expect(await response.json()).toEqual({
      ok: true,
      messages: [],
      hasMore: false,
      description: null,
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('older: pasa beforeId; sin él pide la primera página', async () => {
    listRecordMessagesAction.mockResolvedValue({
      ok: true,
      messages: [],
      hasMore: false,
    })

    await get('kind=ticket&recordId=9&mode=older&beforeId=40')
    expect(listRecordMessagesAction).toHaveBeenLastCalledWith({
      kind: 'ticket',
      recordId: 9,
      beforeId: 40,
    })

    await get('kind=ticket&recordId=9&mode=older')
    expect(listRecordMessagesAction).toHaveBeenLastCalledWith({
      kind: 'ticket',
      recordId: 9,
      beforeId: undefined,
    })
  })

  it('newer: afterId=0 es válido (chat vacío)', async () => {
    listNewerRecordMessagesAction.mockResolvedValue({
      ok: true,
      messages: [],
      hasMore: false,
    })

    await get('kind=task&recordId=3&mode=newer&afterId=0')

    expect(listNewerRecordMessagesAction).toHaveBeenCalledWith({
      kind: 'task',
      recordId: 3,
      afterId: 0,
    })
  })

  it.each([
    ['newer sin afterId', 'kind=task&recordId=3&mode=newer'],
    ['afterId no numérico', 'kind=task&recordId=3&mode=newer&afterId=abc'],
    ['afterId negativo', 'kind=task&recordId=3&mode=newer&afterId=-1'],
    ['tipo desconocido', 'kind=partner&recordId=3&mode=bundle'],
    ['sin tipo', 'recordId=3&mode=bundle'],
    ['recordId no numérico', 'kind=task&recordId=1e3&mode=bundle'],
    ['sin recordId', 'kind=task&mode=bundle'],
    ['modo desconocido', 'kind=task&recordId=3&mode=delete'],
    ['sin modo', 'kind=task&recordId=3'],
  ])('%s: 400 y no llega a ninguna acción', async (_name, query) => {
    const response = await get(query)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, error: 'not_found' })
    expect(getRecordDrawerBundleAction).not.toHaveBeenCalled()
    expect(listRecordMessagesAction).not.toHaveBeenCalled()
    expect(listNewerRecordMessagesAction).not.toHaveBeenCalled()
  })

  it('un rechazo de la acción (sin permiso) llega tal cual', async () => {
    getRecordDrawerBundleAction.mockResolvedValue({
      ok: false,
      error: 'forbidden',
    })

    const response = await get('kind=task&recordId=7&mode=bundle')

    expect(await response.json()).toEqual({ ok: false, error: 'forbidden' })
  })

  it('si la acción revienta responde 500 odoo_unavailable', async () => {
    listNewerRecordMessagesAction.mockRejectedValue(new Error('boom'))

    const response = await get('kind=task&recordId=3&mode=newer&afterId=5')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'odoo_unavailable',
    })
  })
})
