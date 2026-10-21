import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { dispatchPushNotifications, isWebPushConfigured } = vi.hoisted(() => ({
  dispatchPushNotifications: vi.fn(),
  isWebPushConfigured: vi.fn(),
}))

vi.mock('@/src/modules/push/application/dispatch-push-notifications', () => ({
  dispatchPushNotifications,
}))
vi.mock('@/src/modules/push/infrastructure/web-push-sender', () => ({
  isWebPushConfigured,
}))

import { POST } from '@/app/api/push/dispatch/route'

const ORIGINAL = process.env.PUSH_DISPATCH_SECRET

beforeEach(() => {
  vi.resetAllMocks()
  process.env.PUSH_DISPATCH_SECRET = 'test-secret'
  isWebPushConfigured.mockReturnValue(true)
})

afterEach(() => {
  process.env.PUSH_DISPATCH_SECRET = ORIGINAL
})

function req(header?: string): Request {
  return new Request('http://localhost/api/push/dispatch', {
    method: 'POST',
    headers: header ? { authorization: header } : undefined,
  })
}

describe('POST /api/push/dispatch', () => {
  it('rechaza sin cabecera Authorization', async () => {
    const response = await POST(req())
    expect(response.status).toBe(401)
    expect(dispatchPushNotifications).not.toHaveBeenCalled()
  })

  it('rechaza con un secreto incorrecto', async () => {
    const response = await POST(req('Bearer otro'))
    expect(response.status).toBe(401)
    expect(dispatchPushNotifications).not.toHaveBeenCalled()
  })

  it('rechaza si el secreto no está configurado en el servidor', async () => {
    delete process.env.PUSH_DISPATCH_SECRET
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await POST(req('Bearer '))
    expect(response.status).toBe(401)
    expect(dispatchPushNotifications).not.toHaveBeenCalled()
  })

  it('503 si faltan las claves VAPID', async () => {
    isWebPushConfigured.mockReturnValue(false)
    const response = await POST(req('Bearer test-secret'))
    expect(response.status).toBe(503)
    expect(dispatchPushNotifications).not.toHaveBeenCalled()
  })

  it('con el secreto correcto ejecuta el dispatcher y devuelve el resumen', async () => {
    dispatchPushNotifications.mockResolvedValue({
      users: 2,
      sent: 1,
      removed: 0,
      skipped: 0,
      truncated: false,
    })
    const response = await POST(req('Bearer test-secret'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      users: 2,
      sent: 1,
      removed: 0,
      skipped: 0,
      truncated: false,
    })
  })

  it('500 sin filtrar el error si el dispatcher falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dispatchPushNotifications.mockRejectedValue(new Error('secreto interno'))
    const response = await POST(req('Bearer test-secret'))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto interno')
  })
})
