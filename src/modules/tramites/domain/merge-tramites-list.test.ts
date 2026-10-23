import { describe, expect, it } from 'vitest'

import { mergeTramitesList } from '@/src/modules/tramites/domain/merge-tramites-list'
import type { TramiteTask, TramiteTicket } from '@/src/modules/tramites/domain/types'

const task: TramiteTask = {
  id: 1,
  name: 'Alta de autónomo',
  state: '01_in_progress',
  attachmentCount: 2,
  isClosed: false,
  modifiedAt: '2026-10-22T12:00:00.000Z',
  createdAt: '2026-10-01T08:30:00.000Z',
  priority: 3,
  assignees: [{ userId: 7, name: 'Ana García' }],
  parentId: 99,
  assignedNotifyPartnerIds: [701],
}

const ticket: TramiteTicket = {
  id: 2,
  name: 'Duda con el IVA',
  attachmentCount: 0,
  isClosed: false,
  modifiedAt: '2026-10-23T09:00:00.000Z',
  createdAt: '2026-10-20T10:00:00.000Z',
  priority: 1,
  assignees: [{ userId: 9, name: 'Luis Pérez' }],
  assignedNotifyPartnerIds: [901],
}

describe('mergeTramitesList', () => {
  it('conserva en cada elemento la creación, la prioridad y los asignados, sea trámite o consulta', () => {
    const items = mergeTramitesList([task], [ticket])

    expect(items.find((item) => item.kind === 'tramite')).toMatchObject({
      createdAt: task.createdAt,
      priority: 3,
      assignees: task.assignees,
      parentId: 99,
    })
    expect(items.find((item) => item.kind === 'consulta')).toMatchObject({
      createdAt: ticket.createdAt,
      priority: 1,
      assignees: ticket.assignees,
    })
  })

  it('ordena por última actualización, la más reciente primero', () => {
    expect(mergeTramitesList([task], [ticket]).map((item) => item.kind)).toEqual(['consulta', 'tramite'])
  })
})
