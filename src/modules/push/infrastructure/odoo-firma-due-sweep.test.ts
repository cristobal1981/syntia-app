import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead } = vi.hoisted(() => ({ odooSearchRead: vi.fn() }))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/odoo-json-client')>()),
  odooSearchRead,
}))

import { fetchDueSoonSignItems } from '@/src/modules/push/infrastructure/odoo-firma-due-sweep'

const NOW = new Date('2026-10-23T10:00:00Z')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchDueSoonSignItems', () => {
  it('pide solo solicitudes activas con vencimiento en la ventana (con un día de margen) y firmantes pendientes con cliente', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 7, reference: 'Mandato SEPA', validity: '2026-10-26' }])
      .mockResolvedValueOnce([])

    await fetchDueSoonSignItems(NOW)

    expect(odooSearchRead).toHaveBeenNthCalledWith(
      1,
      'sign.request',
      expect.objectContaining({
        domain: [
          ['state', 'in', ['sent', 'shared']],
          ['validity', '>=', '2026-10-22'],
          ['validity', '<=', '2026-10-31'],
        ],
      })
    )
    expect(odooSearchRead).toHaveBeenNthCalledWith(
      2,
      'sign.request.item',
      expect.objectContaining({
        domain: [
          ['sign_request_id', 'in', [7]],
          ['state', 'in', ['sent', 'shared']],
          ['partner_id', '!=', false],
        ],
      })
    )
  })

  it('une cada firmante con su solicitud y descarta los que no cuadran', async () => {
    odooSearchRead
      .mockResolvedValueOnce([
        { id: 7, reference: 'Mandato SEPA', validity: '2026-10-26' },
        { id: 8, reference: false, validity: '2026-10-28' },
        { id: 9, reference: 'Sin fecha', validity: false },
      ])
      .mockResolvedValueOnce([
        { sign_request_id: [7, 'x'], partner_id: [12, 'Cliente'] },
        { sign_request_id: [8, 'y'], partner_id: [13, 'Otro'] },
        { sign_request_id: [99, 'z'], partner_id: [14, 'Huérfano'] },
        { sign_request_id: [7, 'x'], partner_id: false },
      ])

    expect(await fetchDueSoonSignItems(NOW)).toEqual([
      { requestId: 7, reference: 'Mandato SEPA', dueDate: '2026-10-26', partnerId: 12 },
      { requestId: 8, reference: 'Solicitud 8', dueDate: '2026-10-28', partnerId: 13 },
    ])
  })

  it('sin solicitudes en la ventana no consulta los firmantes', async () => {
    odooSearchRead.mockResolvedValueOnce([])
    expect(await fetchDueSoonSignItems(NOW)).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })
})
