import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { loadPushHealthInput } = vi.hoisted(() => ({ loadPushHealthInput: vi.fn() }))
vi.mock('@/src/modules/push/infrastructure/push-health.supabase', () => ({ loadPushHealthInput }))

import { GET } from '@/app/api/push/health/route'

const ORIGINAL = process.env.PUSH_DISPATCH_SECRET
const ORIGINAL_SOURCE = process.env.PUSH_SOURCE
const NOW = Date.parse('2026-10-22T10:00:00Z')

function req(header?: string): Request {
  return new Request('http://localhost/api/push/health', {
    headers: header ? { authorization: header } : undefined,
  })
}

const healthyInput = {
  now: NOW,
  source: 'snapshots',
  runs: [
    { source: 'snapshots', startedAt: NOW - 60_000, hadError: false, locked: false, truncated: false, created: 0 },
  ],
  lastEventAt: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.PUSH_DISPATCH_SECRET = 'test-secret'
  delete process.env.PUSH_SOURCE
  loadPushHealthInput.mockResolvedValue(healthyInput)
})

afterEach(() => {
  vi.useRealTimers()
  process.env.PUSH_DISPATCH_SECRET = ORIGINAL
  if (ORIGINAL_SOURCE === undefined) delete process.env.PUSH_SOURCE
  else process.env.PUSH_SOURCE = ORIGINAL_SOURCE
})

describe('GET /api/push/health', () => {
  it('401 sin secreto o con uno incorrecto, sin consultar nada', async () => {
    expect((await GET(req())).status).toBe(401)
    expect((await GET(req('Bearer otro'))).status).toBe(401)
    expect(loadPushHealthInput).not.toHaveBeenCalled()
  })

  it('200 sin problemas cuando todo va bien', async () => {
    const response = await GET(req('Bearer test-secret'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      source: 'snapshots',
      problems: [],
      checkedAt: '2026-10-22T10:00:00.000Z',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('evalúa con el origen configurado en PUSH_SOURCE', async () => {
    process.env.PUSH_SOURCE = 'events'
    await GET(req('Bearer test-secret'))

    expect(loadPushHealthInput).toHaveBeenCalledWith('events', NOW)
  })

  it('503 con los problemas si hay algún error (pulso parado)', async () => {
    loadPushHealthInput.mockResolvedValue({ ...healthyInput, runs: [] })
    const response = await GET(req('Bearer test-secret'))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.problems).toEqual([expect.objectContaining({ code: 'pulse_stalled', severity: 'error' })])
  })

  it('200 con avisos cuando solo hay avisos (no es motivo de alerta)', async () => {
    process.env.PUSH_SOURCE = 'events'
    loadPushHealthInput.mockResolvedValue({ ...healthyInput, source: 'events', lastEventAt: null })
    const response = await GET(req('Bearer test-secret'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.problems).toEqual([expect.objectContaining({ code: 'events_silent', severity: 'warning' })])
  })

  it('500 sin filtrar el error si falla la consulta', async () => {
    loadPushHealthInput.mockRejectedValue(new Error('secreto interno'))
    const response = await GET(req('Bearer test-secret'))

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('secreto interno')
  })
})
