import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'

export type ClientHomeHeadlineCase =
  | { kind: 'deadline'; name: string; deadline: string; href: string }
  | { kind: 'signatures'; count: number; href: string }
  | { kind: 'obligaciones'; count: number; href: string }
  | { kind: 'tramites'; count: number; href: string }
  | { kind: 'allClear' }

/**
 * Decide qué dato encabeza la home: el plazo más urgente primero (una
 * obligación con fecha límite), luego lo que requiera acción del cliente
 * (firmas), luego lo demás en curso, y solo si todo está a cero, un mensaje
 * de tranquilidad. Evita la plantilla de "3 tarjetas iguales" — un único
 * dato lidera, priorizado por lo que de verdad le importa a un cliente
 * fiscal (plazo > firma pendiente > obligación > trámite).
 */
export function resolveClientHomeHeadlineCase(
  data: ClientDashboardSnapshot
): ClientHomeHeadlineCase {
  if (data.nextObligacion) {
    return {
      kind: 'deadline',
      name: data.nextObligacion.name,
      deadline: data.nextObligacion.deadline,
      href: '/obligaciones',
    }
  }
  if (data.pendingSignatures > 0) {
    return { kind: 'signatures', count: data.pendingSignatures, href: '/firmas' }
  }
  if (data.obligacionesInProgress > 0) {
    return { kind: 'obligaciones', count: data.obligacionesInProgress, href: '/obligaciones' }
  }
  if (data.activeTramitesAndConsultas > 0) {
    return { kind: 'tramites', count: data.activeTramitesAndConsultas, href: '/tramites' }
  }
  return { kind: 'allClear' }
}
