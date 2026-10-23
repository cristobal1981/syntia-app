import { cache } from 'react'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'

/**
 * `cache` de React: en un mismo render (p. ej. los bloques en streaming del
 * inicio) los permisos del mismo usuario se consultan una sola vez; cada
 * petición nueva vuelve a revisarlos.
 */
const loadAllowedSections = cache(
  async (user: PortalUser): Promise<Set<WorkerSectionHref>> => {
    const status = await getWorkerAccessStatus(user)
    return status.allowedSections
  }
)

/**
 * Un colaborador solo conserva acceso mientras su grant esté activo Y el
 * titular tenga la funcionalidad activada — si el titular la desactiva,
 * el colaborador pierde acceso al instante, no solo se bloquean altas nuevas.
 */
export function getAllowedSectionsForWorker(user: PortalUser): Promise<Set<WorkerSectionHref>> {
  return loadAllowedSections(user)
}
