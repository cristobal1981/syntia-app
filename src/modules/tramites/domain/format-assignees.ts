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
