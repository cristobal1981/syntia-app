import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildFirmaDueSoonPayloads,
  isFirmaDueSweepHour,
} from '@/src/modules/push/domain/firma-due-soon'
import { parsePortalEventPayload } from '@/src/modules/push/domain/portal-event'

const NOW = new Date('2026-10-23T10:00:00Z')

const item = (over: Partial<Parameters<typeof buildFirmaDueSoonPayloads>[0][number]> = {}) => ({
  requestId: 7,
  reference: 'Mandato SEPA',
  dueDate: '2026-10-26',
  partnerId: 12,
  ...over,
})

describe('buildFirmaDueSoonPayloads', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('crea un evento por firmante con la solicitud, el firmante y la fecha en el id', () => {
    expect(buildFirmaDueSoonPayloads([item(), item({ partnerId: 13 })], NOW)).toEqual([
      {
        event_id: 'firma-due:7:12:2026-10-26',
        model: 'sign.request',
        kind: 'firma_due_soon',
        record_id: 7,
        record_name: 'Mandato SEPA',
        partner_id: 12,
        occurred_at: NOW.toISOString(),
      },
      expect.objectContaining({ event_id: 'firma-due:7:13:2026-10-26', partner_id: 13 }),
    ])
  })

  it('el id cambia si se amplía el plazo, así que vuelve a avisar', () => {
    const [first] = buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-26' })], NOW) as { event_id: string }[]
    const [second] = buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-29' })], NOW) as { event_id: string }[]
    expect(first!.event_id).not.toBe(second!.event_id)
  })

  it('no avisa si faltan más de 7 días, si ya venció o si la fecha no es válida', () => {
    expect(buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-30' })], NOW)).toHaveLength(1)
    expect(buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-31' })], NOW)).toHaveLength(0)
    expect(buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-22' })], NOW)).toHaveLength(0)
    expect(buildFirmaDueSoonPayloads([item({ dueDate: 'no es fecha' })], NOW)).toHaveLength(0)
  })

  it('un día de plazo que vence hoy sí avisa', () => {
    expect(buildFirmaDueSoonPayloads([item({ dueDate: '2026-10-23' })], NOW)).toHaveLength(1)
  })

  it('lo que genera lo acepta el parser del webhook como aviso de firma', () => {
    const [payload] = buildFirmaDueSoonPayloads([item()], NOW)
    expect(parsePortalEventPayload(payload, { obligacionesPrefix: 'Obligaciones Fiscales' })).toMatchObject({
      status: 'ok',
      event: { kind: 'firma_due_soon', scope: 'firma', partnerId: 12, byClient: false },
    })
  })
})

describe('isFirmaDueSweepHour', () => {
  it('solo entre las 9 y las 19 de Canarias (UTC+1 en octubre y UTC+0 en invierno)', () => {
    expect(isFirmaDueSweepHour(new Date('2026-10-23T07:59:00Z'))).toBe(false)
    expect(isFirmaDueSweepHour(new Date('2026-10-23T08:00:00Z'))).toBe(true)
    expect(isFirmaDueSweepHour(new Date('2026-10-23T18:59:00Z'))).toBe(true)
    expect(isFirmaDueSweepHour(new Date('2026-10-23T19:00:00Z'))).toBe(false)
    expect(isFirmaDueSweepHour(new Date('2026-12-15T08:59:00Z'))).toBe(false)
    expect(isFirmaDueSweepHour(new Date('2026-12-15T09:00:00Z'))).toBe(true)
  })
})
