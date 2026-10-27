import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

/**
 * Añade los mensajes que aún no están y los deja ordenados por id (cronológico en Odoo).
 * Devuelve el mismo array si no hay nada nuevo. Ordenar importa: un mensaje propio recién
 * enviado puede llegar antes que uno anterior de otra persona que se pide después.
 */
export function mergeChatterMessages(
  current: PortalChatterMessage[],
  incoming: PortalChatterMessage[]
): PortalChatterMessage[] {
  const existingIds = new Set(current.map((message) => message.id))
  const added = incoming.filter((message) => !existingIds.has(message.id))
  if (!added.length) return current
  return [...current, ...added].sort((a, b) => a.id - b.id)
}
