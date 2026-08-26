import {
  getWorkerGrant,
  listWorkerGrantsForOwner,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'

/**
 * Titular y colaboradores de la misma empresa ven los mismos trámites,
 * obligaciones y firmas — leer una notificación desde cualquiera de las
 * cuentas debe marcarla leída para todas, o cada login arrastra su propio
 * contador de "sin leer" sobre el mismo hilo. Devuelve el grupo completo
 * (titular + colaboradores) al que pertenece `actorId`, incluyéndolo a él
 * mismo; si `actorId` no es colaborador de nadie, el grupo es solo él.
 */
export async function resolvePortalAccountGroup(
  actorId: string
): Promise<string[]> {
  const grant = await getWorkerGrant(actorId)
  const ownerId = grant?.owner_user_id ?? actorId
  const siblings = await listWorkerGrantsForOwner(ownerId)

  return [...new Set([ownerId, ...siblings.map((s) => s.worker_user_id)])]
}
