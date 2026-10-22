import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sweepPushMessages, isOdooApiConfigured, recordPushRun } = vi.hoisted(() => ({
  sweepPushMessages: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  recordPushRun: vi.fn(),
}))

vi.mock('@/src/modules/push/application/sweep-push-messages', () => ({ sweepPushMessages }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ isOdooApiConfigured }))
vi.mock('@/src/modules/push/infrastructure/push-runs.supabase', () => ({ recordPushRun }))

import { POST } from '@/app/api/push/reconcile/route'

const ORIGINAL = process.env.PUSH_DISPATCH_SECRET

function req(header?: string): Request {
  return new Request('http://localhost/api/push/reconcile', {
    method: 'POST',
    headers: header ? { authorization: header } : undefined,
  })
}

const summary = { scanned: 3, created: 1, existing: 1, skipped: 1, baselined: false, more: true }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.PUSH_DISPATCH_SECRET = 'test-secret'
  isOdooApiConfigured.mockReturnValue(true)
  sweepPushMessages.mockResolvedValue(summary)
  recordPushRun.mockResolvedValue(undefined)
})

afterEach(() => {
  process.env.PUSH_DISPATCH_SECRET = ORIGINAL
})

describe('POST /api/push/reconcile', () => {
  it('401 sin secreto o con uno incorrecto, sin barrer ni registrar', async () => {
    expect((await POST(req())).status).toBe(401)
    expect((await POST(req('Bearer otro'))).status).toBe(401)
    expect(sweepPushMessages).not.toHaveBeenCalled()
    expect(recordPushRun).not.toHaveBeenCalled()
  })

  it('503 si Odoo no está configurado', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    expect((await POST(req('Bearer test-secret'))).status).toBe(503)
    expect(sweepPushMessages).not.toHaveBeenCalled()
  })

  it('con el secreto correcto barre y devuelve el resumen', async () => {
    const response = await POST(req('Bearer test-secret'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, ...summary })
  })

  it('registra el barrido: recuperados como enviados, pendiente como truncado', async () => {
    await POST(req('Bearer test-secret'))

    expect(recordPushRun).toHaveBeenCalledWith({
      source: 'sweep',
      startedAt: expect.any(Date),
      summary: { users: 0, sent: 1, removed: 0, skipped: 1, truncated: true, locked: false },
    })
  })

  it('si falla, registra el error pero no lo devuelve', async () => {
    sweepPushMessages.mockRejectedValue(new Error('secreto interno'))
    const response = await POST(req('Bearer test-secret'))

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto interno')
    expect(recordPushRun).toHaveBeenCalledWith({
      source: 'sweep',
      startedAt: expect.any(Date),
      error: 'secreto interno',
    })
  })
})
