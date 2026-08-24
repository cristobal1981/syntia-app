import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import type {
  PortalNotification,
  PortalNotificationsStats,
  PortalRecordScope,
} from '@/src/modules/portal/domain/portal-notifications-types'

const SECTION_HREF_BY_SCOPE: Record<PortalRecordScope, WorkerSectionHref> = {
  tramite: '/tramites',
  consulta: '/tramites',
  obligacion: '/obligaciones',
  firma: '/firmas',
}

/**
 * El resumen del dashboard y las novedades del chatter agregan datos de
 * trámites/obligaciones/firmas sin mirar permisos por sección — sin este
 * filtro, un colaborador sin acceso a Firmas vería igualmente "N firmas
 * pendientes" o un aviso de mensaje nuevo en una firma que no puede abrir.
 */
export function maskStatsForWorker<T extends PortalNotificationsStats>(
  stats: T,
  allowedSections: Set<WorkerSectionHref>
): T {
  return {
    ...stats,
    activeTramitesAndConsultas: allowedSections.has('/tramites')
      ? stats.activeTramitesAndConsultas
      : 0,
    obligacionesInProgress: allowedSections.has('/obligaciones')
      ? stats.obligacionesInProgress
      : 0,
    pendingSignatures: allowedSections.has('/firmas') ? stats.pendingSignatures : 0,
    nextObligacion: allowedSections.has('/obligaciones') ? stats.nextObligacion : null,
  }
}

export function filterNotificationsForWorker(
  unread: PortalNotification[],
  allowedSections: Set<WorkerSectionHref>
): PortalNotification[] {
  return unread.filter((item) => allowedSections.has(SECTION_HREF_BY_SCOPE[item.scope]))
}
