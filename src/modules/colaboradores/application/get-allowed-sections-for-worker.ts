import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'

/**
 * Un colaborador solo conserva acceso mientras su grant esté activo Y el
 * titular tenga la funcionalidad activada — si el titular la desactiva,
 * el colaborador pierde acceso al instante, no solo se bloquean altas nuevas.
 */
export async function getAllowedSectionsForWorker(
  user: PortalUser
): Promise<Set<WorkerSectionHref>> {
  const status = await getWorkerAccessStatus(user)
  return status.allowedSections
}
