import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  odooSearchRead,
  countAttachmentsByRecordIds,
  getCachedClientProjectIds,
  getCachedObligacionTaskIndex,
} = vi.hoisted(() => ({
  odooSearchRead: vi.fn(),
  countAttachmentsByRecordIds: vi.fn(),
  getCachedClientProjectIds: vi.fn(),
  getCachedObligacionTaskIndex: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/odoo-json-client')>()),
  isOdooApiConfigured: () => true,
  odooSearchRead,
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedClientProjectIds,
  getCachedObligacionTaskIndex,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  countAttachmentsByRecordIds,
}))

import {
  fetchTramitesFromOdoo,
  mapAssignees,
  mapPriority,
} from '@/src/modules/tramites/infrastructure/odoo-tramites-repository'

type Call = [string, { domain?: unknown[]; fields?: string[] }]
const callsTo = (model: string): Call[] =>
  odooSearchRead.mock.calls.filter((call) => call[0] === model) as Call[]

beforeEach(() => {
  vi.resetAllMocks()
  getCachedClientProjectIds.mockResolvedValue([5])
  getCachedObligacionTaskIndex.mockResolvedValue({ excludedTaskIds: [] })
  countAttachmentsByRecordIds.mockResolvedValue(new Map())
  odooSearchRead.mockImplementation(async (model: string, options: { fields?: string[] }) => {
    if (model === 'project.task') {
      return options.fields?.length === 1
        ? [{ id: 10 }]
        : [
            {
              id: 10,
              name: 'Alta de autónomo',
              state: '01_in_progress',
              write_date: '2026-10-22 12:00:00',
              create_date: '2026-10-01 08:30:00',
              priority: '3',
              user_ids: [7, 8, 7],
              parent_id: false,
            },
            {
              id: 11,
              name: 'Aportar el certificado',
              state: '01_in_progress',
              write_date: '2026-10-22 13:00:00',
              create_date: '2026-10-02 09:00:00',
              priority: '0',
              user_ids: [],
              parent_id: [10, 'Alta de autónomo'],
            },
          ]
    }
    if (model === 'helpdesk.ticket') {
      return [
        {
          id: 20,
          name: 'Duda con el IVA',
          close_date: false,
          write_date: '2026-10-23 09:00:00',
          create_date: '2026-10-20 10:00:00',
          priority: '1',
          user_id: [9, 'Luis'],
        },
      ]
    }
    if (model === 'res.users') {
      return [
        { id: 7, name: 'Ana García', partner_id: [701, 'Ana'] },
        { id: 8, name: 'Bruno Díaz', partner_id: false },
        { id: 9, name: 'Luis Pérez', partner_id: [901, 'Luis'] },
      ]
    }
    return []
  })
})

describe('mapPriority', () => {
  it('traduce la selección de Odoo y cualquier otra cosa cuenta como baja', () => {
    expect(['0', '1', '2', '3'].map(mapPriority)).toEqual([0, 1, 2, 3])
    expect([false, null, undefined, '9', 2].map(mapPriority)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('mapAssignees', () => {
  const users = new Map([
    [3, { partnerId: null, name: 'Carla' }],
    [1, { partnerId: 11, name: 'Ana' }],
    [2, { partnerId: null, name: '' }],
  ])

  it('ordena por id, quita repetidos y deja fuera a quien no existe o no tiene nombre', () => {
    expect(mapAssignees([3, 1, 3, 2, 99], users)).toEqual([
      { userId: 1, name: 'Ana', partnerId: 11 },
      { userId: 3, name: 'Carla' },
    ])
  })

  it('sin asignados, lista vacía', () => {
    expect(mapAssignees([], users)).toEqual([])
  })
})

describe('fetchTramitesFromOdoo: fecha de creación, prioridad y asignados', () => {
  it('pide a Odoo la creación, la prioridad y los asignados de tareas y tickets', async () => {
    await fetchTramitesFromOdoo(1233)

    const taskFields = callsTo('project.task').map((call) => call[1].fields).find((f) => f!.length > 1)!
    expect(taskFields).toEqual(expect.arrayContaining(['create_date', 'priority', 'user_ids']))
    const ticketFields = callsTo('helpdesk.ticket')[0]![1].fields!
    expect(ticketFields).toEqual(expect.arrayContaining(['create_date', 'priority', 'user_id']))
  })

  it('una tarea lleva su creación, su prioridad y sus asignados con nombre (sin repetidos), y los partners para el chatter', async () => {
    const { tasks } = await fetchTramitesFromOdoo(1233)

    expect(tasks[0]).toMatchObject({
      id: 10,
      createdAt: '2026-10-01T08:30:00.000Z',
      modifiedAt: '2026-10-22T12:00:00.000Z',
      priority: 3,
      assignees: [
        { userId: 7, name: 'Ana García', partnerId: 701 },
        { userId: 8, name: 'Bruno Díaz' },
      ],
      assignedNotifyPartnerIds: [701],
    })
  })

  it('una subtarea sin nadie asignado enseña a quien lleva su padre (marcada como heredada), pero sus avisos del chatter siguen siendo los propios', async () => {
    const { tasks } = await fetchTramitesFromOdoo(1233)
    const child = tasks.find((task) => task.id === 11)!
    const parent = tasks.find((task) => task.id === 10)!

    expect(child.assignees).toEqual(parent.assignees)
    expect(child.assigneesInherited).toBe(true)
    expect(child.assignedNotifyPartnerIds).toEqual([])
    expect(parent.assigneesInherited).toBeUndefined()
  })

  it('un ticket lleva su creación, su prioridad y su responsable', async () => {
    const { tickets } = await fetchTramitesFromOdoo(1233)

    expect(tickets[0]).toMatchObject({
      id: 20,
      createdAt: '2026-10-20T10:00:00.000Z',
      priority: 1,
      assignees: [{ userId: 9, name: 'Luis Pérez', partnerId: 901 }],
      assignedNotifyPartnerIds: [901],
    })
  })

})

describe('fetchTramitesFromOdoo: lecturas a Odoo en paralelo y sin repetir', () => {
  // Los usuarios ya conocidos se guardan en memoria y no se vuelven a pedir: cada test usa ids propios.
  let nextUserBase = 7100
  let userIds: number[] = []
  let taskRow: Record<string, unknown> = {}
  let ticketRow: Record<string, unknown> = {}

  beforeEach(() => {
    const base = (nextUserBase += 10)
    userIds = [base + 1, base + 2, base + 3]
    taskRow = { id: 10, name: 'T', state: '01_in_progress', write_date: '2026-10-22 12:00:00', create_date: '2026-10-01 08:30:00', priority: '0', user_ids: [userIds[0], userIds[1]], parent_id: false }
    ticketRow = { id: 20, name: 'K', close_date: false, write_date: '2026-10-23 09:00:00', create_date: '2026-10-20 10:00:00', priority: '0', user_id: [userIds[2], 'Luis'] }
  })

  function stubOdoo(overrides: Record<string, () => Promise<unknown[]>> = {}) {
    odooSearchRead.mockImplementation(async (model: string, options: { fields?: string[] }) => {
      if (model === 'project.task') {
        return options.fields?.length === 1 ? [{ id: 10 }] : (overrides.tasks?.() ?? [taskRow])
      }
      if (model === 'helpdesk.ticket') return overrides.tickets?.() ?? [ticketRow]
      if (model === 'res.users') {
        return overrides.users?.() ?? userIds.map((id) => ({ id, name: `U${id}`, partner_id: false }))
      }
      return []
    })
  }

  it('pide los nombres de los usuarios en UNA sola consulta para tareas y tickets juntos', async () => {
    stubOdoo()

    await fetchTramitesFromOdoo(1233)

    const userCalls = callsTo('res.users')
    expect(userCalls).toHaveLength(1)
    const requested = (userCalls[0]![1].domain as [string, string, number[]][])[0]![2]
    expect([...requested].sort()).toEqual([...userIds].sort())
  })

  it('las tareas y los tickets se piden a la vez, sin esperar unos a otros', async () => {
    let releaseTasks: () => void = () => {}
    const tasksGate = new Promise<void>((resolve) => {
      releaseTasks = resolve
    })
    stubOdoo({
      tasks: async () => {
        await tasksGate
        return [taskRow]
      },
    })

    const pending = fetchTramitesFromOdoo(1233)
    await vi.waitFor(() => expect(callsTo('helpdesk.ticket')).toHaveLength(1))
    // Los tickets ya se han pedido aunque las tareas siguen sin responder.
    expect(callsTo('res.users')).toHaveLength(0)
    releaseTasks()

    const snapshot = await pending
    expect(snapshot.tasks).toHaveLength(1)
    expect(snapshot.tickets).toHaveLength(1)
  })

  it('los usuarios y los recuentos de adjuntos se piden a la vez', async () => {
    let releaseCounts: () => void = () => {}
    const countsGate = new Promise<void>((resolve) => {
      releaseCounts = resolve
    })
    stubOdoo()
    countAttachmentsByRecordIds.mockImplementation(async () => {
      await countsGate
      return new Map()
    })

    const pending = fetchTramitesFromOdoo(1233)
    // Los recuentos están bloqueados y aun así se consultan los usuarios.
    await vi.waitFor(() => expect(callsTo('res.users')).toHaveLength(1))
    expect(countAttachmentsByRecordIds).toHaveBeenCalledTimes(2)
    releaseCounts()

    await pending
  })

  it('los recuentos de adjuntos no esperan a la respuesta de los usuarios', async () => {
    let releaseUsers: () => void = () => {}
    const usersGate = new Promise<void>((resolve) => {
      releaseUsers = resolve
    })
    stubOdoo({
      users: async () => {
        await usersGate
        return userIds.map((id) => ({ id, name: `U${id}`, partner_id: false }))
      },
    })
    countAttachmentsByRecordIds.mockResolvedValue(new Map())

    const pending = fetchTramitesFromOdoo(1233)
    await vi.waitFor(() => expect(countAttachmentsByRecordIds).toHaveBeenCalledTimes(2))
    // Los usuarios siguen sin responder y los recuentos ya se han pedido.
    expect(callsTo('res.users')).toHaveLength(1)
    releaseUsers()

    await pending
  })

  it('cuenta los adjuntos de tareas y de tickets cada uno en su modelo, con sus ids', async () => {
    stubOdoo()

    await fetchTramitesFromOdoo(1233)

    expect(countAttachmentsByRecordIds).toHaveBeenCalledWith('project.task', [10])
    expect(countAttachmentsByRecordIds).toHaveBeenCalledWith('helpdesk.ticket', [20])
  })

  it('sin proyectos del cliente no se leen tareas y los tickets se devuelven igualmente', async () => {
    getCachedClientProjectIds.mockResolvedValue([])
    stubOdoo()

    const snapshot = await fetchTramitesFromOdoo(1233)

    expect(callsTo('project.task')).toHaveLength(0)
    expect(snapshot.tasks).toEqual([])
    expect(snapshot.tickets).toHaveLength(1)
  })
})
