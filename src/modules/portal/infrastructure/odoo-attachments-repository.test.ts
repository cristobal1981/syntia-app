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

import {
  countAttachmentsByModels,
  fetchAttachmentBinariesByIds,
} from '@/src/modules/portal/infrastructure/odoo-attachments-repository'

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

describe('countAttachmentsByModels', () => {
  it('con un solo modelo pide ese modelo y sus ids, sin operadores', async () => {
    odooSearchRead.mockResolvedValue([{ res_id: 10, res_model: 'project.task' }])

    await countAttachmentsByModels([{ resModel: 'project.task', resIds: [10, 11] }])

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(odooSearchRead).toHaveBeenCalledWith('ir.attachment', {
      domain: [
        ['res_model', '=', 'project.task'],
        ['res_id', 'in', [10, 11]],
      ],
      fields: ['res_id', 'res_model'],
      limit: 500,
    })
  })

  it('con dos modelos hace UNA consulta con un O exacto: cada modelo con sus ids', async () => {
    odooSearchRead.mockResolvedValue([])

    await countAttachmentsByModels([
      { resModel: 'project.task', resIds: [5] },
      { resModel: 'helpdesk.ticket', resIds: [5, 6] },
    ])

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(odooSearchRead).toHaveBeenCalledWith('ir.attachment', {
      domain: [
        '|',
        '&',
        ['res_model', '=', 'project.task'],
        ['res_id', 'in', [5]],
        '&',
        ['res_model', '=', 'helpdesk.ticket'],
        ['res_id', 'in', [5, 6]],
      ],
      fields: ['res_id', 'res_model'],
      limit: 1000,
    })
  })

  it('cuenta por modelo y por id: el mismo id en dos modelos no se mezcla', async () => {
    odooSearchRead.mockResolvedValue([
      { res_id: 5, res_model: 'project.task' },
      { res_id: 5, res_model: 'project.task' },
      { res_id: 5, res_model: 'helpdesk.ticket' },
      { res_id: 6, res_model: 'helpdesk.ticket' },
    ])

    const counts = await countAttachmentsByModels([
      { resModel: 'project.task', resIds: [5] },
      { resModel: 'helpdesk.ticket', resIds: [5, 6] },
    ])

    expect(counts.get('project.task')).toEqual(new Map([[5, 2]]))
    expect(counts.get('helpdesk.ticket')).toEqual(
      new Map([
        [5, 1],
        [6, 1],
      ])
    )
  })

  it('un modelo sin ids se omite de la consulta y queda con el mapa vacío', async () => {
    odooSearchRead.mockResolvedValue([{ res_id: 20, res_model: 'helpdesk.ticket' }])

    const counts = await countAttachmentsByModels([
      { resModel: 'project.task', resIds: [] },
      { resModel: 'helpdesk.ticket', resIds: [20] },
    ])

    expect(odooSearchRead.mock.calls[0]![1].domain).toEqual([
      ['res_model', '=', 'helpdesk.ticket'],
      ['res_id', 'in', [20]],
    ])
    expect(counts.get('project.task')).toEqual(new Map())
    expect(counts.get('helpdesk.ticket')).toEqual(new Map([[20, 1]]))
  })

  it('sin ningún id no llama a Odoo', async () => {
    const counts = await countAttachmentsByModels([
      { resModel: 'project.task', resIds: [] },
      { resModel: 'helpdesk.ticket', resIds: [] },
    ])

    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(counts.size).toBe(2)
  })

  it('ignora filas sin id de registro, sin modelo o de un modelo que no se pidió', async () => {
    odooSearchRead.mockResolvedValue([
      { res_id: false, res_model: 'project.task' },
      { res_id: 10, res_model: false },
      { res_id: 10, res_model: 'otro.modelo' },
      { res_id: 10, res_model: 'project.task' },
    ])

    const counts = await countAttachmentsByModels([{ resModel: 'project.task', resIds: [10] }])

    expect(counts.get('project.task')).toEqual(new Map([[10, 1]]))
    expect(counts.has('otro.modelo')).toBe(false)
  })

  it('el tope por modelo se aplica al total: 500 por cada modelo pedido', async () => {
    odooSearchRead.mockResolvedValue([])

    await countAttachmentsByModels([{ resModel: 'a', resIds: [1] }, { resModel: 'b', resIds: [1] }, { resModel: 'c', resIds: [1] }], 200)

    expect(odooSearchRead.mock.calls[0]![1].limit).toBe(600)
  })

  it('propaga el error de Odoo', async () => {
    odooSearchRead.mockRejectedValue(new Error('boom'))

    await expect(countAttachmentsByModels([{ resModel: 'a', resIds: [1] }])).rejects.toThrow('boom')
  })
})
