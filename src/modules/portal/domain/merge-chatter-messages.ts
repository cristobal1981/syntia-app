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

/**
 * Adjuntos que traen los mensajes de `incoming` que el chat aún no tenía (`knownIds`): lo que
 * cambia el contador de documentos cuando alguien sube un archivo con el chat abierto. Un mensaje
 * ya presente (p. ej. el propio recién enviado, que ya se contó al subirlo) no suma.
 */
export function countAttachmentsInNewMessages(
  incoming: readonly PortalChatterMessage[],
  knownIds: ReadonlySet<number>
): number {
  let total = 0
  const seen = new Set<number>()
  for (const message of incoming) {
    if (knownIds.has(message.id) || seen.has(message.id)) continue
    seen.add(message.id)
    total += message.attachments?.length ?? 0
  }
  return total
}
