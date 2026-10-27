import { beforeEach, describe, expect, it, vi } from 'vitest'

const { checkPortalNewsSignalAction } = vi.hoisted(() => ({
  checkPortalNewsSignalAction: vi.fn(),
}))

vi.mock('@/src/modules/portal/application/portal-chatter-notifications-actions', () => ({
  checkPortalNewsSignalAction,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/portal/news-signal/route'

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/portal/news-signal', () => {
  it('devuelve lo que responde la acción, sin caché', async () => {
    checkPortalNewsSignalAction.mockResolvedValue({
      ok: true,
      mode: 'events',
      seq: 12,
      fullCheckMaxAgeMs: 300_000,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      mode: 'events',
      seq: 12,
      fullCheckMaxAgeMs: 300_000,
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('un rechazo de la acción (sin sesión) llega tal cual', async () => {
    checkPortalNewsSignalAction.mockResolvedValue({ ok: false, error: 'forbidden' })

    const response = await GET()

    expect(await response.json()).toEqual({ ok: false, error: 'forbidden' })
  })

  it('si la acción lanza, 500 con error genérico y sin filtrar el motivo', async () => {
    checkPortalNewsSignalAction.mockRejectedValue(new Error('secreto interno'))

    const response = await GET()

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto')
  })
})
