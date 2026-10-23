import { describe, expect, it } from 'vitest'

import { inheritAssignees } from '@/src/modules/tramites/domain/inherit-assignees'
import type { TramiteAssignee, TramiteTask } from '@/src/modules/tramites/domain/types'

const ana: TramiteAssignee = { userId: 1, name: 'Ana', partnerId: 11 }
const bruno: TramiteAssignee = { userId: 2, name: 'Bruno' }

function task(id: number, over: Partial<TramiteTask> = {}): TramiteTask {
  return {
    id,
    name: `t${id}`,
    attachmentCount: 0,
    isClosed: false,
    modifiedAt: '',
    createdAt: '',
    priority: 0,
    assignees: [],
    assignedNotifyPartnerIds: [],
    ...over,
  }
}

const byId = (tasks: TramiteTask[], id: number) => tasks.find((t) => t.id === id)!

describe('inheritAssignees', () => {
  it('una subtarea sin nadie lleva a quien lleva su padre, y queda marcada como heredada', () => {
    const result = inheritAssignees([task(1, { assignees: [ana] }), task(2, { parentId: 1 })])
    expect(byId(result, 2)).toMatchObject({ assignees: [ana], assigneesInherited: true })
  })

  it('la que ya tiene a alguien conserva a los suyos y no se marca', () => {
    const result = inheritAssignees([task(1, { assignees: [ana] }), task(2, { parentId: 1, assignees: [bruno] })])
    expect(byId(result, 2).assignees).toEqual([bruno])
    expect(byId(result, 2).assigneesInherited).toBeUndefined()
  })

  it('salta los antecesores sin nadie y coge el más cercano que tenga a alguien', () => {
    const result = inheritAssignees([
      task(1, { assignees: [ana] }),
      task(2, { parentId: 1 }),
      task(3, { parentId: 2 }),
    ])
    expect(byId(result, 3).assignees).toEqual([ana])
  })

  it('con dos niveles con responsable, manda el más cercano', () => {
    const result = inheritAssignees([
      task(1, { assignees: [ana] }),
      task(2, { parentId: 1, assignees: [bruno] }),
      task(3, { parentId: 2 }),
    ])
    expect(byId(result, 3).assignees).toEqual([bruno])
  })

  it('un padre que no está en la lista, o nadie arriba, no aporta nada', () => {
    const result = inheritAssignees([task(2, { parentId: 99 }), task(3)])
    expect(byId(result, 2).assignees).toEqual([])
    expect(byId(result, 2).assigneesInherited).toBeUndefined()
    expect(byId(result, 3).assignees).toEqual([])
  })

  it('un ciclo de padres no se cuelga', () => {
    const result = inheritAssignees([task(1, { parentId: 2 }), task(2, { parentId: 1 })])
    expect(result.map((t) => t.assignees)).toEqual([[], []])
  })

  it('no toca los avisos del chatter (siguen siendo los propios) ni deja a la hija heredar de una hermana', () => {
    const result = inheritAssignees([
      task(1, { assignees: [ana], assignedNotifyPartnerIds: [11] }),
      task(2, { parentId: 1, assignedNotifyPartnerIds: [] }),
      task(3, { parentId: 1, assignees: [bruno] }),
      task(4, { parentId: 1 }),
    ])
    expect(byId(result, 2).assignedNotifyPartnerIds).toEqual([])
    expect(byId(result, 4).assignees).toEqual([ana])
  })

  it('no modifica la entrada', () => {
    const input = [task(1, { assignees: [ana] }), task(2, { parentId: 1 })]
    inheritAssignees(input)
    expect(input[1]!.assignees).toEqual([])
  })
})
