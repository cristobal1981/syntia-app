import { beforeEach, describe, expect, it, vi } from 'vitest'

const { checkPortalNotificationsAction } = vi.hoisted(() => ({
  checkPortalNotificationsAction: vi.fn(),
}))

vi.mock('@/src/modules/portal/application/portal-chatter-notifications-actions', () => ({
  checkPortalNotificationsAction,
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/portal/notifications-check/route'

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function post(body: unknown, headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) {
  return new Request('https://app.syntia.es/api/portal/notifications-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/portal/notifications-check', () => {
  it('devuelve el resultado de la acción, sin caché', async () => {
    checkPortalNotificationsAction.mockResolvedValue({ ok: true, unread: [] })

    const response = await POST(post({}))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, unread: [] })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(checkPortalNotificationsAction).toHaveBeenCalledWith(undefined)
  })

  it('reuseRecentSnapshots solo se respeta si es exactamente true', async () => {
    checkPortalNotificationsAction.mockResolvedValue({ ok: true })

    await POST(post({ reuseRecentSnapshots: true }))
    expect(checkPortalNotificationsAction).toHaveBeenLastCalledWith({ reuseRecentSnapshots: true })

    await POST(post({ reuseRecentSnapshots: 'true' }))
    expect(checkPortalNotificationsAction).toHaveBeenLastCalledWith(undefined)
  })

  it('chatterOnly solo se respeta si es exactamente true, y se combina con reuseRecentSnapshots', async () => {
    checkPortalNotificationsAction.mockResolvedValue({ ok: true })

    await POST(post({ chatterOnly: true }))
    expect(checkPortalNotificationsAction).toHaveBeenLastCalledWith({ chatterOnly: true })

    await POST(post({ chatterOnly: 'true', reuseRecentSnapshots: false }))
    expect(checkPortalNotificationsAction).toHaveBeenLastCalledWith(undefined)

    await POST(post({ chatterOnly: true, reuseRecentSnapshots: true }))
    expect(checkPortalNotificationsAction).toHaveBeenLastCalledWith({
      reuseRecentSnapshots: true,
      chatterOnly: true,
    })
  })

  it('un cuerpo ilegible es una comprobación normal', async () => {
    checkPortalNotificationsAction.mockResolvedValue({ ok: true })

    const response = await POST(post('{no es json'))

    expect(response.status).toBe(200)
    expect(checkPortalNotificationsAction).toHaveBeenCalledWith(undefined)
  })

  it('una petición de otro sitio se rechaza sin ejecutar nada', async () => {
    const response = await POST(post({}, { 'sec-fetch-site': 'cross-site' }))

    expect(response.status).toBe(403)
    expect(checkPortalNotificationsAction).not.toHaveBeenCalled()
  })

  it('si la acción lanza, 500 genérico sin filtrar el motivo', async () => {
    checkPortalNotificationsAction.mockRejectedValue(new Error('secreto interno'))

    const response = await POST(post({}))

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto')
  })
})
