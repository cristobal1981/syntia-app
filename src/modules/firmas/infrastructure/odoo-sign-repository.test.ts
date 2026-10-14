import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isOdooApiConfigured, odooSearchRead } = vi.hoisted(() => ({
  isOdooApiConfigured: vi.fn(),
  odooSearchRead: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return { ...actual, isOdooApiConfigured, odooSearchRead }
})

import {
  fetchPendingSignaturesFromOdoo,
  fetchSignatureHistoryFromOdoo,
} from '@/src/modules/firmas/infrastructure/odoo-sign-repository'

const CERT = 'Certificado de firma electrónica - 2025-01-02 - 10:11:12.pdf'

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  process.env.ODOO_URL = 'https://odoo.test'
})

describe('fetchPendingSignaturesFromOdoo', () => {
  it('lanza ODOO_NOT_CONFIGURED sin consultar', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    await expect(fetchPendingSignaturesFromOdoo(1)).rejects.toThrow('ODOO_NOT_CONFIGURED')
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('filtra items por partner y estados pendientes; solicitudes por activas', async () => {
    odooSearchRead
      .mockResolvedValueOnce([
        { id: 1, sign_request_id: [5, 'Ref 5'], create_date: '2025-01-01', access_token: 'tok' },
      ])
      .mockResolvedValueOnce([{ id: 5, reference: 'REF-5', create_date: '2025-02-02', validity: '2025-03-03' }])
    const res = await fetchPendingSignaturesFromOdoo(42)
    expect(odooSearchRead).toHaveBeenNthCalledWith(1, 'sign.request.item', {
      domain: [
        ['partner_id', '=', 42],
        ['state', 'in', ['sent', 'shared']],
      ],
      fields: ['sign_request_id', 'state', 'create_date', 'access_token'],
      order: 'id desc',
      limit: 50,
    })
    expect(odooSearchRead).toHaveBeenNthCalledWith(2, 'sign.request', {
      domain: [
        ['id', 'in', [5]],
        ['state', 'in', ['sent', 'shared']],
      ],
      fields: ['reference', 'create_date', 'state', 'validity'],
      order: 'create_date desc, id desc',
      limit: 50,
    })
    expect(res).toEqual([
      {
        id: 5,
        reference: 'REF-5',
        createDate: '2025-01-01',
        dueDate: '2025-03-03',
        signUrl: 'https://odoo.test/sign/document/5/tok',
      },
    ])
  })

  it('sin items → [] sin segunda consulta', async () => {
    odooSearchRead.mockResolvedValueOnce([])
    expect(await fetchPendingSignaturesFromOdoo(1)).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('descarta solicitudes sin token (sin URL firmable)', async () => {
    odooSearchRead
      .mockResolvedValueOnce([
        { id: 1, sign_request_id: [5, 'A'], access_token: false },
        { id: 2, sign_request_id: [6, 'B'], access_token: 'tk' },
      ])
      .mockResolvedValueOnce([
        { id: 5, reference: 'A' },
        { id: 6, reference: 'B' },
      ])
    const res = await fetchPendingSignaturesFromOdoo(1)
    expect(res.map((r) => r.id)).toEqual([6])
  })

  it('referencia vacía usa la etiqueta many2one; deduplica ids de solicitud', async () => {
    odooSearchRead
      .mockResolvedValueOnce([
        { id: 1, sign_request_id: [5, 'Etiqueta'], access_token: 'a' },
        { id: 2, sign_request_id: [5, 'Etiqueta'], access_token: 'b' },
      ])
      .mockResolvedValueOnce([{ id: 5, reference: '  ' }])
    const res = await fetchPendingSignaturesFromOdoo(1)
    expect(odooSearchRead.mock.calls[1][1].domain[0]).toEqual(['id', 'in', [5]])
    expect(res).toHaveLength(1)
    expect(res[0].reference).toBe('Etiqueta')
    expect(res[0].signUrl).toBe('https://odoo.test/sign/document/5/a')
  })

  it('preserva el orden devuelto por Odoo', async () => {
    odooSearchRead
      .mockResolvedValueOnce([
        { id: 1, sign_request_id: [9, 'x'], access_token: 't' },
        { id: 2, sign_request_id: [3, 'y'], access_token: 't' },
      ])
      .mockResolvedValueOnce([
        { id: 3, reference: 'R3' },
        { id: 9, reference: 'R9' },
      ])
    const res = await fetchPendingSignaturesFromOdoo(1)
    expect(res.map((r) => r.id)).toEqual([3, 9])
  })
})

describe('fetchSignatureHistoryFromOdoo', () => {
  function mockHistory(
    items: unknown[],
    requests: unknown[],
    attachments: Array<{ id: number; name: unknown }> = []
  ) {
    odooSearchRead
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce(requests)
      .mockResolvedValueOnce(attachments)
  }

  it('lanza ODOO_NOT_CONFIGURED', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    await expect(fetchSignatureHistoryFromOdoo(1)).rejects.toThrow('ODOO_NOT_CONFIGURED')
  })

  it('filtra por partner y estados hechos, orden por fecha de firma', async () => {
    odooSearchRead.mockResolvedValueOnce([])
    await fetchSignatureHistoryFromOdoo(42)
    expect(odooSearchRead).toHaveBeenCalledWith('sign.request.item', {
      domain: [
        ['partner_id', '=', 42],
        ['state', 'in', ['completed']],
      ],
      fields: ['sign_request_id', 'signing_date'],
      order: 'signing_date desc, id desc',
      limit: 50,
    })
  })

  it('sin items con fecha de firma → [] sin más consultas', async () => {
    odooSearchRead.mockResolvedValueOnce([
      { id: 1, sign_request_id: [5, 'x'], signing_date: false },
    ])
    expect(await fetchSignatureHistoryFromOdoo(1)).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('consulta solo solicitudes del partner y nombres de adjuntos por id', async () => {
    mockHistory(
      [{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01 10:00:00' }],
      [{ id: 5, reference: 'REF', completed_document_attachment_ids: [11, 12] }],
      [{ id: 11, name: 'REF' }]
    )
    await fetchSignatureHistoryFromOdoo(1)
    expect(odooSearchRead).toHaveBeenNthCalledWith(2, 'sign.request', {
      domain: [['id', 'in', [5]]],
      fields: ['reference', 'create_date', 'completed_document_attachment_ids'],
      limit: 1,
    })
    expect(odooSearchRead).toHaveBeenNthCalledWith(3, 'ir.attachment', {
      domain: [['id', 'in', [11, 12]]],
      fields: ['name'],
      limit: 2,
    })
  })

  it('no consulta adjuntos si no hay ninguno', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' }])
      .mockResolvedValueOnce([{ id: 5, reference: 'R', completed_document_attachment_ids: false }])
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(odooSearchRead).toHaveBeenCalledTimes(2)
    expect(res[0].documentAttachmentId).toBeUndefined()
    expect(res[0].certificateAttachmentId).toBeUndefined()
  })

  it('documento por coincidencia exacta de referencia, certificado por sufijo', async () => {
    mockHistory(
      [{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' }],
      [{ id: 5, reference: ' Contrato ', completed_document_attachment_ids: [10, 11, 12] }],
      [
        { id: 10, name: 'Otro.pdf' },
        { id: 11, name: 'Contrato' },
        { id: 12, name: CERT },
      ]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res[0].documentAttachmentId).toBe(11)
    expect(res[0].certificateAttachmentId).toBe(12)
    expect(res[0].reference).toBe('Contrato')
  })

  it('sin coincidencia exacta: primer adjunto con nombre que no es el certificado', async () => {
    mockHistory(
      [{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' }],
      [{ id: 5, reference: 'Ref', completed_document_attachment_ids: [12, 10, 11] }],
      [
        { id: 12, name: CERT },
        { id: 10, name: 'a.pdf' },
        { id: 11, name: 'b.pdf' },
      ]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res[0].documentAttachmentId).toBe(10)
    expect(res[0].certificateAttachmentId).toBe(12)
  })

  it('el certificado nunca se elige como documento', async () => {
    mockHistory(
      [{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' }],
      [{ id: 5, reference: 'Ref', completed_document_attachment_ids: [12] }],
      [{ id: 12, name: CERT }]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res[0].documentAttachmentId).toBeUndefined()
    expect(res[0].certificateAttachmentId).toBe(12)
  })

  it('adjuntos sin nombre conocido no se eligen como documento ni certificado', async () => {
    mockHistory(
      [{ id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' }],
      [{ id: 5, reference: 'Ref', completed_document_attachment_ids: [20, 21] }],
      [{ id: 21, name: 'real.pdf' }]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res[0].documentAttachmentId).toBe(21)
  })

  it('referencia ausente usa "Solicitud <id>" y la fecha de firma es la del item más reciente', async () => {
    mockHistory(
      [
        { id: 2, sign_request_id: [5, 'x'], signing_date: '2025-05-05' },
        { id: 1, sign_request_id: [5, 'x'], signing_date: '2025-01-01' },
      ],
      [{ id: 5, reference: false, create_date: '2024-12-12', completed_document_attachment_ids: [] }]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res[0].reference).toBe('Solicitud 5')
    expect(res[0].signedDate).toBe('2025-05-05')
    expect(res[0].createDate).toBe('2024-12-12')
  })

  it('ordena por fecha de firma descendente', async () => {
    mockHistory(
      [
        { id: 1, sign_request_id: [1, 'a'], signing_date: '2025-01-01' },
        { id: 2, sign_request_id: [2, 'b'], signing_date: '2025-03-01' },
        { id: 3, sign_request_id: [3, 'c'], signing_date: '2025-02-01' },
      ],
      [
        { id: 1, reference: 'A' },
        { id: 2, reference: 'B' },
        { id: 3, reference: 'C' },
      ]
    )
    const res = await fetchSignatureHistoryFromOdoo(1)
    expect(res.map((r) => r.id)).toEqual([2, 3, 1])
  })
})
