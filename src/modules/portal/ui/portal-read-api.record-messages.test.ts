import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchNewerRecordMessages,
  fetchOlderRecordMessages,
  fetchRecordDrawerBundle,
} from '@/src/modules/portal/ui/portal-read-api'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const jsonResponse = (body: unknown) => ({ json: async () => body })

describe('lecturas del chat por HTTP', () => {
  it('bundle: GET sin caché con tipo, id y modo', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ok: true, messages: [], hasMore: false, description: null }),
    )

    await fetchRecordDrawerBundle('task', 12)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/portal/record-messages?kind=task&recordId=12&mode=bundle')
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', credentials: 'same-origin' })
  })

  it('older: incluye beforeId solo si existe', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, messages: [], hasMore: false }))

    await fetchOlderRecordMessages('ticket', 3, 90)
    await fetchOlderRecordMessages('ticket', 3, undefined)

    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/portal/record-messages?kind=ticket&recordId=3&mode=older&beforeId=90',
    )
    expect(fetchMock.mock.calls[1]![0]).toBe(
      '/api/portal/record-messages?kind=ticket&recordId=3&mode=older',
    )
  })

  it('newer: afterId 0 viaja en la URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, messages: [], hasMore: false }))

    await fetchNewerRecordMessages('task', 5, 0)

    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/portal/record-messages?kind=task&recordId=5&mode=newer&afterId=0',
    )
  })

  it('una respuesta que no es JSON se traduce a odoo_unavailable', async () => {
    fetchMock.mockResolvedValue({
      json: async () => {
        throw new SyntaxError('no json')
      },
    })

    expect(await fetchNewerRecordMessages('task', 5, 1)).toEqual({
      ok: false,
      error: 'odoo_unavailable',
    })
  })

  it('un fallo de red rechaza (lo trata quien llama, como con la acción)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchRecordDrawerBundle('task', 5)).rejects.toThrow(TypeError)
  })
})
