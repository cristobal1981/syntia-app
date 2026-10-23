import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import {
  getLastStatusLabel,
  getMaxPortalEventSeq,
  getMaxPortalEventSeqForPartner,
  insertPortalEvent,
  listMaturePortalEvents,
} from '@/src/modules/push/infrastructure/portal-events.supabase'
import type { PortalEventInput } from '@/src/modules/push/domain/portal-event'

const event: PortalEventInput = {
  eventId: 'msg:1',
  partnerId: 5,
  kind: 'message',
  scope: 'tramite',
  recordId: 9,
  recordName: 'IRPF',
  stateLabel: null,
  previousStateLabel: null,
  messageId: 1,
  excerpt: 'Hola',
  byClient: false,
  occurredAt: '2026-10-22T10:00:00.000Z',
}

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = { data: result.data ?? null, error: result.error ?? null }
  const c: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const name of ['select', 'upsert', 'order', 'gt', 'lte', 'eq']) c[name] = vi.fn(() => c)
  c.limit = vi.fn(() => Promise.resolve(resolved))
  ;(c as { then?: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  return c
}

function use(c: ReturnType<typeof chain>) {
  const from = vi.fn(() => c)
  createSupabaseAdminClient.mockReturnValue({ from })
  return from
}

beforeEach(() => vi.resetAllMocks())

describe('insertPortalEvent', () => {
  it('inserta ignorando duplicados por event_id y traduce a columnas', async () => {
    const c = chain({ data: [{ seq: 3 }] })
    const from = use(c)

    expect(await insertPortalEvent(event)).toBe('created')
    expect(from).toHaveBeenCalledWith('portal_events')
    expect(c.upsert).toHaveBeenCalledWith(
      {
        event_id: 'msg:1',
        partner_id: 5,
        kind: 'message',
        scope: 'tramite',
        record_id: 9,
        record_name: 'IRPF',
        state_label: null,
        previous_state_label: null,
        message_id: 1,
        excerpt: 'Hola',
        by_client: false,
        occurred_at: '2026-10-22T10:00:00.000Z',
      },
      { onConflict: 'event_id', ignoreDuplicates: true }
    )
  })

  it('si el evento ya estaba guardado no devuelve fila y es un duplicado', async () => {
    use(chain({ data: [] }))
    expect(await insertPortalEvent(event)).toBe('duplicate')
  })

  it('propaga el error de BD', async () => {
    use(chain({ error: { message: 'boom' } }))
    await expect(insertPortalEvent(event)).rejects.toThrow('boom')
  })
})

describe('getMaxPortalEventSeq', () => {
  it('pide el mayor seq', async () => {
    const c = chain({ data: [{ seq: 41 }] })
    use(c)

    expect(await getMaxPortalEventSeq()).toBe(41)
    expect(c.order).toHaveBeenCalledWith('seq', { ascending: false })
    expect(c.limit).toHaveBeenCalledWith(1)
  })

  it('0 si no hay eventos', async () => {
    use(chain({ data: [] }))
    expect(await getMaxPortalEventSeq()).toBe(0)
  })

  it('propaga el error de BD', async () => {
    use(chain({ error: { message: 'boom' } }))
    await expect(getMaxPortalEventSeq()).rejects.toThrow('boom')
  })
})

describe('listMaturePortalEvents', () => {
  const dbRow = {
    seq: 8,
    event_id: 'e',
    partner_id: 5,
    kind: 'status',
    scope: 'consulta',
    record_id: 9,
    record_name: 'IVA',
    state_label: 'Hecho',
    previous_state_label: 'En curso',
    message_id: null,
    excerpt: null,
    by_client: true,
    occurred_at: '2026-10-22T10:00:00Z',
    received_at: '2026-10-22T10:00:01Z',
  }

  it('filtra por seq y antigüedad, ordena y limita', async () => {
    const c = chain({ data: [dbRow] })
    use(c)
    const cutoff = new Date('2026-10-22T10:05:00Z')

    await listMaturePortalEvents(7, cutoff, 500)

    expect(c.gt).toHaveBeenCalledWith('seq', 7)
    expect(c.lte).toHaveBeenCalledWith('received_at', cutoff.toISOString())
    expect(c.order).toHaveBeenCalledWith('seq', { ascending: true })
    expect(c.limit).toHaveBeenCalledWith(500)
  })

  it('mapea las columnas al evento', async () => {
    use(chain({ data: [dbRow] }))

    expect(await listMaturePortalEvents(0, new Date(), 10)).toEqual([
      {
        seq: 8,
        eventId: 'e',
        partnerId: 5,
        kind: 'status',
        scope: 'consulta',
        recordId: 9,
        recordName: 'IVA',
        stateLabel: 'Hecho',
        previousStateLabel: 'En curso',
        messageId: null,
        excerpt: null,
        byClient: true,
        occurredAt: '2026-10-22T10:00:00Z',
        receivedAt: '2026-10-22T10:00:01Z',
      },
    ])
  })

  it('propaga el error de BD', async () => {
    use(chain({ error: { message: 'boom' } }))
    await expect(listMaturePortalEvents(0, new Date(), 10)).rejects.toThrow('boom')
  })
})

describe('getLastStatusLabel', () => {
  it('pide el último evento de estado de ese registro y ámbito', async () => {
    const c = chain({ data: [{ state_label: 'En curso' }] })
    use(c)

    expect(await getLastStatusLabel('obligacion', 77)).toBe('En curso')
    expect(c.eq).toHaveBeenCalledWith('kind', 'status')
    expect(c.eq).toHaveBeenCalledWith('scope', 'obligacion')
    expect(c.eq).toHaveBeenCalledWith('record_id', 77)
    expect(c.order).toHaveBeenCalledWith('seq', { ascending: false })
    expect(c.limit).toHaveBeenCalledWith(1)
  })

  it('null si no hay evento previo o no tenía etiqueta', async () => {
    use(chain({ data: [] }))
    expect(await getLastStatusLabel('tramite', 1)).toBeNull()

    use(chain({ data: [{ state_label: null }] }))
    expect(await getLastStatusLabel('tramite', 1)).toBeNull()
  })

  it('propaga el error de BD', async () => {
    use(chain({ error: { message: 'boom' } }))
    await expect(getLastStatusLabel('tramite', 1)).rejects.toThrow('boom')
  })
})

describe('getMaxPortalEventSeqForPartner', () => {
  it('pide el último seq solo de ese cliente', async () => {
    const c = chain({ data: [{ seq: 41 }] })
    const from = use(c)

    expect(await getMaxPortalEventSeqForPartner(1233)).toBe(41)
    expect(from).toHaveBeenCalledWith('portal_events')
    expect(c.eq).toHaveBeenCalledWith('partner_id', 1233)
    expect(c.order).toHaveBeenCalledWith('seq', { ascending: false })
    expect(c.limit).toHaveBeenCalledWith(1)
  })

  it('0 si el cliente no tiene eventos, y propaga el error de la base', async () => {
    use(chain({ data: [] }))
    expect(await getMaxPortalEventSeqForPartner(1)).toBe(0)

    use(chain({ error: { message: 'boom' } }))
    await expect(getMaxPortalEventSeqForPartner(1)).rejects.toThrow('boom')
  })
})
