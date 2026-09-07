import type { LeadEstado } from '@/src/modules/leads/domain/types'

/**
 * Cuatro tonos claramente distintos (ámbar/verde/rojo/azul), no cuatro
 * verdes del mismo `--chart-1..4` — reutiliza los mismos tokens que ya usan
 * los badges de estado de trámite (`badge-status-*`) para que "pendiente"/
 * "aceptado"/"rechazado" lean igual en toda la app.
 */
export const ESTADO_SOLID_CLASS: Record<LeadEstado, string> = {
  pendiente: 'bg-service-fiscal',
  aceptado: 'bg-primary',
  rechazado: 'bg-destructive',
  no_interesa: 'bg-sky-500',
}

export const ESTADO_BADGE_CLASS: Record<LeadEstado, string> = {
  pendiente: 'badge-status-pending',
  aceptado: 'badge-status-done',
  rechazado: 'badge-status-canceled',
  no_interesa: 'badge-lead-no-interesa',
}
