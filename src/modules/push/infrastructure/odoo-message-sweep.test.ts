import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead } = vi.hoisted(() => ({ odooSearchRead: vi.fn() }))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/odoo-json-client')>()),
  odooSearchRead,
}))

import {
  fetchMaxMessageId,
  fetchSweepMessages,
  fetchSweepProjectPartners,
  fetchSweepTasks,
  fetchSweepTickets,
  toOdooDateTime,
} from '@/src/modules/push/infrastructure/odoo-message-sweep'

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env.ODOO_TICKETS_MODEL
})

describe('toOdooDateTime', () => {
  it('da la fecha en UTC con el formato de Odoo', () => {
    expect(toOdooDateTime(new Date('2026-10-22T12:34:56.789Z'))).toBe('2026-10-22 12:34:56')
  })
})

describe('fetchMaxMessageId', () => {
  it('pide el mayor id anterior al instante dado', async () => {
    odooSearchRead.mockResolvedValue([{ id: 900 }])

    expect(await fetchMaxMessageId(new Date('2026-10-22T12:00:00Z'))).toBe(900)
    expect(odooSearchRead).toHaveBeenCalledWith('mail.message', {
      domain: [['date', '<', '2026-10-22 12:00:00']],
      fields: ['id'],
      order: 'id desc',
      limit: 1,
    })
  })

  it('0 si Odoo no tiene mensajes', async () => {
    odooSearchRead.mockResolvedValue([])
    expect(await fetchMaxMessageId(new Date())).toBe(0)
  })
})

describe('fetchSweepMessages', () => {
  it('pide solo comentarios públicos de tareas y tickets posteriores al cursor y antiguos', async () => {
    odooSearchRead.mockResolvedValue([])
    await fetchSweepMessages(50, new Date('2026-10-22T11:50:00Z'), 200)

    expect(odooSearchRead).toHaveBeenCalledWith('mail.message', {
      domain: [
        ['model', 'in', ['project.task', 'helpdesk.ticket']],
        ['message_type', '=', 'comment'],
        ['subtype_id.internal', '=', false],
        ['id', '>', 50],
        ['date', '<', '2026-10-22 11:50:00'],
      ],
      fields: ['id', 'model', 'res_id', 'body', 'author_id', 'date'],
      order: 'id asc',
      limit: 200,
    })
  })

  it('el modelo de tickets sale de la configuración', async () => {
    process.env.ODOO_TICKETS_MODEL = 'x.tickets'
    odooSearchRead.mockResolvedValue([])
    await fetchSweepMessages(0, new Date(), 10)

    expect(odooSearchRead.mock.calls[0]![1].domain[0]).toEqual([
      'model',
      'in',
      ['project.task', 'x.tickets'],
    ])
  })

  it('mapea las filas y descarta las que no apuntan a un registro', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 1, model: 'project.task', res_id: 9, body: '<p>x</p>', author_id: [7, 'Ana'], date: '2026-10-22 10:00:00' },
      { id: 2, model: 'project.task', res_id: false, body: false, author_id: false, date: false },
      { id: 3, model: false, res_id: 4 },
      { id: 4, model: 'helpdesk.ticket', res_id: 5, body: false, author_id: false, date: '2026-10-22 10:01:00' },
    ])

    expect(await fetchSweepMessages(0, new Date(), 10)).toEqual([
      { id: 1, model: 'project.task', resId: 9, body: '<p>x</p>', authorId: 7, date: '2026-10-22 10:00:00' },
      { id: 4, model: 'helpdesk.ticket', resId: 5, body: '', authorId: null, date: '2026-10-22 10:01:00' },
    ])
  })
})

describe('fetchSweepTasks', () => {
  const row = (id: number, parent: number | false, extra: Record<string, unknown> = {}) => ({
    id,
    name: `T${id}`,
    parent_id: parent ? [parent, `T${parent}`] : false,
    project_id: [10, 'P'],
    partner_id: false,
    x_studio_mostrar_en_syntia: false,
    ...extra,
  })

  it('sube por los padres en lotes hasta la raíz', async () => {
    odooSearchRead
      .mockResolvedValueOnce([row(3, 2)])
      .mockResolvedValueOnce([row(2, 1)])
      .mockResolvedValueOnce([row(1, false, { x_studio_mostrar_en_syntia: true })])

    const tasks = await fetchSweepTasks([3])

    expect([...tasks.keys()].sort()).toEqual([1, 2, 3])
    expect(tasks.get(1)).toMatchObject({ showInSyntia: true, parentId: null, projectId: 10 })
    expect(tasks.get(3)).toMatchObject({ parentId: 2, showInSyntia: false })
    expect(odooSearchRead).toHaveBeenCalledTimes(3)
    expect(odooSearchRead.mock.calls[1]![1].domain).toEqual([['id', 'in', [2]]])
  })

  it('pide en un solo lote varias tareas con el mismo padre, sin repetir ids', async () => {
    odooSearchRead
      .mockResolvedValueOnce([row(3, 1), row(4, 1)])
      .mockResolvedValueOnce([row(1, false)])

    await fetchSweepTasks([3, 3, 4])

    expect(odooSearchRead.mock.calls[0]![1].domain).toEqual([['id', 'in', [3, 4]]])
    expect(odooSearchRead.mock.calls[1]![1].domain).toEqual([['id', 'in', [1]]])
  })

  it('no vuelve a pedir una tarea que ya tiene', async () => {
    odooSearchRead.mockResolvedValueOnce([row(1, 2), row(2, false)])
    await fetchSweepTasks([1, 2])

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('un ciclo de padres no pide para siempre', async () => {
    odooSearchRead.mockResolvedValueOnce([row(1, 2)]).mockResolvedValueOnce([row(2, 1)])
    await fetchSweepTasks([1])

    expect(odooSearchRead).toHaveBeenCalledTimes(2)
  })

  it('el flag solo cuenta cuando es true', async () => {
    odooSearchRead.mockResolvedValueOnce([row(1, false, { x_studio_mostrar_en_syntia: 'yes' })])
    expect((await fetchSweepTasks([1])).get(1)?.showInSyntia).toBe(false)
  })

  it('una tarea con campos vacíos se mapea con valores seguros', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 1, name: false, parent_id: false, project_id: false }])
    expect((await fetchSweepTasks([1])).get(1)).toEqual({
      id: 1,
      name: '',
      parentId: null,
      projectId: null,
      partnerId: null,
      showInSyntia: false,
    })
  })

  it('no consulta con una lista vacía', async () => {
    expect((await fetchSweepTasks([])).size).toBe(0)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })
})

describe('fetchSweepTickets', () => {
  it('mapea nombre y cliente del ticket', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 5, name: 'Duda', partner_id: [77, 'ACME'] },
      { id: 6, name: false, partner_id: false },
    ])

    expect(await fetchSweepTickets([5, 6, 5])).toEqual(
      new Map([
        [5, { id: 5, name: 'Duda', partnerId: 77 }],
        [6, { id: 6, name: '', partnerId: null }],
      ])
    )
    expect(odooSearchRead).toHaveBeenCalledWith('helpdesk.ticket', {
      domain: [['id', 'in', [5, 6]]],
      fields: ['id', 'name', 'partner_id'],
      limit: 3,
    })
  })
})

describe('fetchSweepProjectPartners', () => {
  it('mapea el cliente de cada proyecto, o null si no tiene', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 10, partner_id: [55, 'ACME'] },
      { id: 11, partner_id: false },
    ])

    expect(await fetchSweepProjectPartners([10, 11, 10])).toEqual(
      new Map([
        [10, 55],
        [11, null],
      ])
    )
    expect(odooSearchRead.mock.calls[0]![0]).toBe('project.project')
    expect(odooSearchRead.mock.calls[0]![1].domain).toEqual([['id', 'in', [10, 11]]])
  })
})
