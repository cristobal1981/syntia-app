import type { TramiteTask } from '@/src/modules/tramites/domain/types'

/** Niveles de antecesores que se recorren (más son un ciclo o un error de datos). */
const MAX_DEPTH = 10

/**
 * Una subtarea sin nadie asignado enseña a quien lleva su antecesor más cercano
 * que tenga a alguien: para el cliente, quien le atiende es quien lleva el trámite.
 * Solo cambia `assignees` y marca `assigneesInherited`; los avisos del chatter
 * (`assignedNotifyPartnerIds`) siguen siendo los propios. Un antecesor que no está
 * en la lista no aporta nada.
 */
export function inheritAssignees(tasks: TramiteTask[]): TramiteTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]))

  return tasks.map((task) => {
    if (task.assignees.length > 0) return task

    const visited = new Set<number>([task.id])
    let parentId = task.parentId
    for (let depth = 0; parentId !== undefined && depth < MAX_DEPTH; depth += 1) {
      if (visited.has(parentId)) break
      visited.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      if (parent.assignees.length > 0) {
        return { ...task, assignees: parent.assignees, assigneesInherited: true }
      }
      parentId = parent.parentId
    }
    return task
  })
}
