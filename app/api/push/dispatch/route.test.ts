import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { dispatchPushNotifications, dispatchPushEvents, isWebPushConfigured, recordPushRun } =
  vi.hoisted(() => ({
    dispatchPushNotifications: vi.fn(),
    dispatchPushEvents: vi.fn(),
    isWebPushConfigured: vi.fn(),
    recordPushRun: vi.fn(),
  }))

vi.mock('@/src/modules/push/application/dispatch-push-notifications', () => ({
  dispatchPushNotifications,
  dispatchPushEvents,
}))
vi.mock('@/src/modules/push/infrastructure/push-runs.supabase', () => ({ recordPushRun }))
vi.mock('@/src/modules/push/infrastructure/web-push-sender', () => ({
  isWebPushConfigured,
}))

import { POST } from '@/app/api/push/dispatch/route'

const ORIGINAL = process.env.PUSH_DISPATCH_SECRET
const ORIGINAL_SOURCE = process.env.PUSH_SOURCE

beforeEach(() => {
  vi.resetAllMocks()
  process.env.PUSH_DISPATCH_SECRET = 'test-secret'
  isWebPushConfigured.mockReturnValue(true)
  recordPushRun.mockResolvedValue(undefined)
  delete process.env.PUSH_SOURCE
})

afterEach(() => {
  process.env.PUSH_DISPATCH_SECRET = ORIGINAL
  if (ORIGINAL_SOURCE === undefined) delete process.env.PUSH_SOURCE
  else process.env.PUSH_SOURCE = ORIGINAL_SOURCE
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
      locked: false,
    })
    const response = await POST(req('Bearer test-secret'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      source: 'snapshots',
      users: 2,
      sent: 1,
      removed: 0,
      skipped: 0,
      truncated: false,
      locked: false,
    })
  })

  it('por defecto usa el cálculo por snapshots', async () => {
    dispatchPushNotifications.mockResolvedValue({ users: 0 })
    await POST(req('Bearer test-secret'))

    expect(dispatchPushNotifications).toHaveBeenCalledTimes(1)
    expect(dispatchPushEvents).not.toHaveBeenCalled()
  })

  it('con PUSH_SOURCE=events usa los eventos de Odoo y no el cálculo anterior', async () => {
    process.env.PUSH_SOURCE = 'events'
    dispatchPushEvents.mockResolvedValue({ users: 1, sent: 1 })
    const response = await POST(req('Bearer test-secret'))

    expect(dispatchPushEvents).toHaveBeenCalledTimes(1)
    expect(dispatchPushNotifications).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ ok: true, source: 'events', sent: 1 })
  })

  it('registra la ejecución con su origen y su resumen', async () => {
    process.env.PUSH_SOURCE = 'events'
    const summary = { users: 1, sent: 1, removed: 0, skipped: 0, truncated: false, locked: false }
    dispatchPushEvents.mockResolvedValue(summary)
    await POST(req('Bearer test-secret'))

    expect(recordPushRun).toHaveBeenCalledWith({
      source: 'events',
      startedAt: expect.any(Date),
      summary,
    })
  })

  it('si falla, registra el error en la tabla pero no lo devuelve', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dispatchPushNotifications.mockRejectedValue(new Error('secreto interno'))
    const response = await POST(req('Bearer test-secret'))

    expect(recordPushRun).toHaveBeenCalledWith({
      source: 'snapshots',
      startedAt: expect.any(Date),
      error: 'secreto interno',
    })
    expect(JSON.stringify(await response.json())).not.toContain('secreto interno')
  })

  it('no registra nada si la petición no está autorizada', async () => {
    await POST(req('Bearer otro'))
    expect(recordPushRun).not.toHaveBeenCalled()
  })

  it('500 sin filtrar el error si el dispatcher falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dispatchPushNotifications.mockRejectedValue(new Error('secreto interno'))
    const response = await POST(req('Bearer test-secret'))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto interno')
  })
})
