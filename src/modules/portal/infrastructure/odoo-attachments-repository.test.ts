import { describe, expect, it, vi, beforeEach } from 'vitest'

const { isOdooApiConfigured, odooSearchRead } = vi.hoisted(() => ({
  isOdooApiConfigured: vi.fn(),
  odooSearchRead: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
  odooSearchRead,
  odooCall: vi.fn(),
}))

import { fetchAttachmentBinariesByIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'

function rowFor(id: number, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    name: `archivo-${id}.pdf`,
    mimetype: 'application/pdf',
    datas: `base64-${id}`,
    res_model: 'helpdesk.ticket',
    res_id: 42,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
})

describe('fetchAttachmentBinariesByIds', () => {
  it('devuelve un array vacío sin llamar a Odoo si no hay ids', async () => {
    const result = await fetchAttachmentBinariesByIds([])

    expect(result).toEqual([])
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('hace una única llamada batch con "id in (...)", no una por adjunto', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1), rowFor(2), rowFor(3)])

    await fetchAttachmentBinariesByIds([1, 2, 3])

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(odooSearchRead).toHaveBeenCalledWith(
      'ir.attachment',
      expect.objectContaining({ domain: [['id', 'in', [1, 2, 3]]] })
    )
  })

  it('devuelve los binarios en el mismo orden que los ids pedidos, no el orden de respuesta de Odoo', async () => {
    odooSearchRead.mockResolvedValue([rowFor(3), rowFor(1), rowFor(2)])

    const result = await fetchAttachmentBinariesByIds([1, 2, 3])

    expect(result.map((binary) => binary.id)).toEqual([1, 2, 3])
  })

  it('mapea correctamente cada campo del adjunto', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1)])

    const [binary] = await fetchAttachmentBinariesByIds([1])

    expect(binary).toEqual({
      id: 1,
      filename: 'archivo-1.pdf',
      mimetype: 'application/pdf',
      dataBase64: 'base64-1',
      resModel: 'helpdesk.ticket',
      resId: 42,
    })
  })

  it('usa application/octet-stream si Odoo no informa mimetype', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1, { mimetype: false })])

    const [binary] = await fetchAttachmentBinariesByIds([1])

    expect(binary.mimetype).toBe('application/octet-stream')
  })

  it('lanza ODOO_ATTACHMENT_NOT_FOUND si Odoo no devuelve uno de los ids pedidos', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1)])

    await expect(fetchAttachmentBinariesByIds([1, 2])).rejects.toThrow(
      'ODOO_ATTACHMENT_NOT_FOUND'
    )
  })

  it('lanza ODOO_ATTACHMENT_NOT_FOUND si el adjunto no tiene datas (sin contenido)', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1, { datas: false })])

    await expect(fetchAttachmentBinariesByIds([1])).rejects.toThrow(
      'ODOO_ATTACHMENT_NOT_FOUND'
    )
  })

  it('lanza ODOO_ATTACHMENT_NOT_FOUND si al adjunto le falta res_model/res_id', async () => {
    odooSearchRead.mockResolvedValue([rowFor(1, { res_model: false })])

    await expect(fetchAttachmentBinariesByIds([1])).rejects.toThrow(
      'ODOO_ATTACHMENT_NOT_FOUND'
    )
  })

  it('lanza ODOO_NOT_CONFIGURED si Odoo no está configurado, sin llamar a odooSearchRead', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    await expect(fetchAttachmentBinariesByIds([1])).rejects.toThrow('ODOO_NOT_CONFIGURED')
    expect(odooSearchRead).not.toHaveBeenCalled()
  })
})
