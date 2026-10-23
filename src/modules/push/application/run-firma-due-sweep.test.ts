import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runFirmaDueSweep } from '@/src/modules/push/application/run-firma-due-sweep'

const NOON = Date.parse('2026-10-23T12:00:00Z')
const NIGHT = Date.parse('2026-10-23T02:00:00Z')

const fetchDueSoonItems = vi.fn()
const insertEvent = vi.fn()

function deps(now = NOON) {
  return { fetchDueSoonItems, insertEvent, now: () => now, obligacionesPrefix: 'Obligaciones Fiscales' }
}

const due = (over = {}) => ({ requestId: 7, reference: 'Mandato', dueDate: '2026-10-26', partnerId: 12, ...over })

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  insertEvent.mockResolvedValue('created')
})

describe('runFirmaDueSweep', () => {
  it('crea el evento de cada firmante y cuenta los nuevos y los repetidos', async () => {
    fetchDueSoonItems.mockResolvedValue([due(), due({ partnerId: 13 })])
    insertEvent.mockResolvedValueOnce('created').mockResolvedValueOnce('duplicate')

    expect(await runFirmaDueSweep(deps())).toEqual({
      scanned: 2,
      created: 1,
      existing: 1,
      outsideHours: false,
    })
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'firma-due:7:12:2026-10-26',
        kind: 'firma_due_soon',
        scope: 'firma',
        partnerId: 12,
      })
    )
  })

  it('de madrugada no consulta Odoo ni crea nada', async () => {
    vi.setSystemTime(NIGHT)
    expect(await runFirmaDueSweep(deps(NIGHT))).toEqual({
      scanned: 0,
      created: 0,
      existing: 0,
      outsideHours: true,
    })
    expect(fetchDueSoonItems).not.toHaveBeenCalled()
    expect(insertEvent).not.toHaveBeenCalled()
  })

  it('descarta lo que ya no está en la ventana aunque Odoo lo devuelva', async () => {
    fetchDueSoonItems.mockResolvedValue([due({ dueDate: '2026-11-20' }), due({ dueDate: '2026-10-20' })])
    const summary = await runFirmaDueSweep(deps())
    expect(summary).toMatchObject({ scanned: 2, created: 0 })
    expect(insertEvent).not.toHaveBeenCalled()
  })

  it('si Odoo falla, el error sube sin crear eventos', async () => {
    fetchDueSoonItems.mockRejectedValue(new Error('429'))
    await expect(runFirmaDueSweep(deps())).rejects.toThrow('429')
    expect(insertEvent).not.toHaveBeenCalled()
  })
})
