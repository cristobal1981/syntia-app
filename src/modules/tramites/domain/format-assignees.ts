import type { TramiteAssignee } from '@/src/modules/tramites/domain/types'

/**
 * Quién lo lleva, para una línea discreta del drawer: un nombre, dos unidos con
 * «y», y a partir de tres los dos primeros y cuántos más. `null` si no hay nadie.
 */
export function formatAssigneesLabel(assignees: readonly TramiteAssignee[]): string | null {
  const names = assignees.map((assignee) => assignee.name.trim()).filter(Boolean)
  if (names.length === 0) return null
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names[0]}, ${names[1]} y ${names.length - 2} más`
}

/**
 * Huella de quién lo lleva: los ids de usuario de Odoo, sin repetir, ordenados y
 * unidos por comas («» = nadie). Dos listas con las mismas personas dan la misma
 * huella aunque Odoo las devuelva en otro orden.
 */
export function assigneeKeyFor(assignees: readonly TramiteAssignee[]): string {
  return [...new Set(assignees.map((assignee) => assignee.userId))].sort((a, b) => a - b).join(',')
}

/** Quiénes enseñan foto en la línea del drawer: los primeros con partner (de ahí sale la foto), hasta `max`. */
export function assigneesWithPhoto(
  assignees: readonly TramiteAssignee[],
  max = 3
): (TramiteAssignee & { partnerId: number })[] {
  return assignees
    .filter((assignee): assignee is TramiteAssignee & { partnerId: number } => Boolean(assignee.partnerId))
    .slice(0, max)
}
