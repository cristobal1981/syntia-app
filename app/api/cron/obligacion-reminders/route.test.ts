import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { runObligacionReminders } = vi.hoisted(() => ({
  runObligacionReminders: vi.fn(),
}))

vi.mock('@/src/modules/obligaciones/application/run-obligacion-reminders', () => ({
  runObligacionReminders,
}))

import { GET } from '@/app/api/cron/obligacion-reminders/route'

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

beforeEach(() => {
  vi.resetAllMocks()
  process.env.CRON_SECRET = 'test-secret'
})

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
})

function requestWithAuth(header?: string): Request {
  return new Request('http://localhost/api/cron/obligacion-reminders', {
    headers: header ? { authorization: header } : undefined,
  })
}

describe('GET /api/cron/obligacion-reminders', () => {
  it('rejects a request with no Authorization header', async () => {
    const response = await GET(requestWithAuth())

    expect(response.status).toBe(401)
    expect(runObligacionReminders).not.toHaveBeenCalled()
  })

  it('rejects a request with the wrong secret', async () => {
    const response = await GET(requestWithAuth('Bearer wrong-secret'))

    expect(response.status).toBe(401)
    expect(runObligacionReminders).not.toHaveBeenCalled()
  })

  it('rejects every request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const response = await GET(requestWithAuth('Bearer test-secret'))

    expect(response.status).toBe(401)
    expect(runObligacionReminders).not.toHaveBeenCalled()
  })

  it('runs the reminders flow and returns its summary with the correct secret', async () => {
    runObligacionReminders.mockResolvedValue({
      candidates: 2,
      sent: 1,
      emailsSent: 1,
      skippedAlreadySent: 1,
      skippedNoEmail: 0,
    })

    const response = await GET(requestWithAuth('Bearer test-secret'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      candidates: 2,
      sent: 1,
      emailsSent: 1,
      skippedAlreadySent: 1,
      skippedNoEmail: 0,
    })
  })
})
