import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { after, runPushAfterEventInProduction, insertPortalEvent, getLastStatusLabel, invalidatePortalCachesForEvent } = vi.hoisted(() => ({
  after: vi.fn(),
  runPushAfterEventInProduction: vi.fn(),
  insertPortalEvent: vi.fn(),
  getLastStatusLabel: vi.fn(),
  invalidatePortalCachesForEvent: vi.fn(),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}))
vi.mock('@/src/modules/push/application/dispatch-push-after-event', () => ({
  runPushAfterEventInProduction,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-cache-invalidation', () => ({
  invalidatePortalCachesForEvent,
}))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({
  insertPortalEvent,
  getLastStatusLabel,
}))

import { POST } from '@/app/api/webhooks/odoo-events/route'

const ORIGINAL = process.env.ODOO_EVENTS_SECRET

const valid = {
  event_id: 'msg:1',
  partner_id: 5,
  kind: 'message',
  model: 'project.task',
  record_id: 9,
  record_name: 'IRPF',
  message_id: 1,
  message_body: '<p>Hola</p>',
  occurred_at: '2026-10-22T10:00:00Z',
}

function req(body: unknown, header: string | undefined = 'Bearer test-secret'): Request {
  return new Request('http://localhost/api/webhooks/odoo-events', {
    method: 'POST',
    headers: header ? { authorization: header } : undefined,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.ODOO_EVENTS_SECRET = 'test-secret'
  insertPortalEvent.mockResolvedValue('created')
  getLastStatusLabel.mockResolvedValue(null)
})

afterEach(() => {
  process.env.ODOO_EVENTS_SECRET = ORIGINAL
})

describe('POST /api/webhooks/odoo-events', () => {
  it('401 sin cabecera Authorization y no guarda nada', async () => {
    const response = await POST(req(valid, ''))
    expect(response.status).toBe(401)
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('401 con un secreto incorrecto', async () => {
    expect((await POST(req(valid, 'Bearer otro'))).status).toBe(401)
    expect((await POST(req(valid, 'test-secret'))).status).toBe(401)
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('401 si el secreto no está configurado, aunque llegue «Bearer »', async () => {
    delete process.env.ODOO_EVENTS_SECRET
    expect((await POST(req(valid, 'Bearer '))).status).toBe(401)
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('400 si el cuerpo no es JSON', async () => {
    expect((await POST(req('no es json'))).status).toBe(400)
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('422 si el evento no es válido', async () => {
    const response = await POST(req({ ...valid, partner_id: 0 }))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ ok: false, error: 'invalid_event' })
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('un periodo de obligaciones es válido pero no se guarda (200 ignored)', async () => {
    const response = await POST(
      req({ ...valid, kind: 'status', state: '1_done', ancestor_names: ['Obligaciones Fiscales 2026'] })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'ignored' })
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  describe('cambios de estado', () => {
    const status = { ...valid, kind: 'status', message_id: undefined, state: '1_done' }

    it('completa el estado anterior con el último conocido', async () => {
      getLastStatusLabel.mockResolvedValue('En curso')
      await POST(req(status))

      expect(getLastStatusLabel).toHaveBeenCalledWith('tramite', 9)
      expect(insertPortalEvent).toHaveBeenCalledWith(
        expect.objectContaining({ stateLabel: 'Hecho', previousStateLabel: 'En curso' })
      )
    })

    it('si el estado visible no cambia, no guarda nada y responde ignored', async () => {
      getLastStatusLabel.mockResolvedValue('Hecho')
      const response = await POST(req(status))

      expect(await response.json()).toEqual({ ok: true, status: 'ignored' })
      expect(insertPortalEvent).not.toHaveBeenCalled()
    })

    it('un mensaje no consulta el último estado', async () => {
      await POST(req(valid))
      expect(getLastStatusLabel).not.toHaveBeenCalled()
    })

    it('500 si no se puede consultar el último estado, para que Odoo reintente', async () => {
      getLastStatusLabel.mockRejectedValue(new Error('bd'))
      expect((await POST(req(status))).status).toBe(500)
      expect(insertPortalEvent).not.toHaveBeenCalled()
    })
  })

  it('413 si el cuerpo es enorme, sin intentar interpretarlo', async () => {
    const response = await POST(req({ ...valid, message_body: 'x'.repeat(200_000) }))
    expect(response.status).toBe(413)
    expect(insertPortalEvent).not.toHaveBeenCalled()
  })

  it('guarda el evento ya limpio (extracto, no el HTML) y responde created', async () => {
    const response = await POST(req(valid))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'created' })
    expect(insertPortalEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'msg:1', partnerId: 5, excerpt: 'Hola' })
    )
  })

  it('un reintento de Odoo responde 200 duplicate', async () => {
    insertPortalEvent.mockResolvedValue('duplicate')
    const response = await POST(req(valid))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, status: 'duplicate' })
  })

  it('500 si no se puede guardar, para que Odoo lo reintente', async () => {
    insertPortalEvent.mockRejectedValue(new Error('bd'))
    expect((await POST(req(valid))).status).toBe(500)
  })

  it('un evento nuevo invalida las cachés de su cliente; un duplicado, uno ignorado o uno inválido no', async () => {
    await POST(req(valid))
    expect(invalidatePortalCachesForEvent).toHaveBeenCalledTimes(1)
    expect(invalidatePortalCachesForEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'message', partnerId: 5 })
    )

    invalidatePortalCachesForEvent.mockClear()
    insertPortalEvent.mockResolvedValue('duplicate')
    await POST(req(valid))
    await POST(req({ ...valid, kind: 'nope' }))
    await POST(req({ ...valid, event_id: 'task:1:1', kind: 'new_record', message_id: undefined, ancestor_names: ['Obligaciones Fiscales'], record_name: 'Obligaciones Fiscales 2026' }))
    expect(invalidatePortalCachesForEvent).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/odoo-events: push desde el webhook', () => {
  const ENV_KEYS = ['PUSH_FROM_WEBHOOK', 'PUSH_SOURCE'] as const
  const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  function enable() {
    process.env.PUSH_FROM_WEBHOOK = '1'
    process.env.PUSH_SOURCE = 'events'
  }

  it('evento nuevo con el interruptor encendido programa el envío con after()', async () => {
    enable()

    const response = await POST(req(valid))

    expect(response.status).toBe(200)
    expect(after).toHaveBeenCalledTimes(1)
    const scheduled = after.mock.calls[0]![0] as () => unknown
    scheduled()
    expect(runPushAfterEventInProduction).toHaveBeenCalledWith(5)
  })

  it('con el interruptor apagado no programa nada', async () => {
    delete process.env.PUSH_FROM_WEBHOOK
    process.env.PUSH_SOURCE = 'events'

    await POST(req(valid))

    expect(after).not.toHaveBeenCalled()
  })

  it('con PUSH_SOURCE distinto de events no programa nada', async () => {
    process.env.PUSH_FROM_WEBHOOK = '1'
    process.env.PUSH_SOURCE = 'snapshots'

    await POST(req(valid))

    expect(after).not.toHaveBeenCalled()
  })

  it('un duplicado no programa envío (su evento ya tiene el suyo)', async () => {
    enable()
    insertPortalEvent.mockResolvedValue('duplicate')

    await POST(req(valid))

    expect(after).not.toHaveBeenCalled()
  })

  it('un evento ignorado, inválido o sin autorización no programa envío', async () => {
    enable()

    await POST(req({ ...valid, kind: 'nope' }))
    await POST(req(valid, 'Bearer otro'))
    await POST(req({ ...valid, event_id: 'task:1:1', kind: 'new_record', message_id: undefined, ancestor_names: ['Obligaciones Fiscales'], record_name: 'Obligaciones Fiscales 2026' }))

    expect(after).not.toHaveBeenCalled()
  })

  it('si no se puede guardar el evento no programa envío y responde 500', async () => {
    enable()
    insertPortalEvent.mockRejectedValue(new Error('bd'))

    expect((await POST(req(valid))).status).toBe(500)
    expect(after).not.toHaveBeenCalled()
  })
})
