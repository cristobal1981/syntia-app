import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'

/**
 * A diferencia de `getAllowedSectionsForWorker` (¿puede ver la sección?),
 * esto responde ¿puede mutar dentro de ella? — usar en los puntos que
 * gatean una acción de escritura real (comentar, subir/borrar documentos,
 * crear un trámite), no en los que solo gatean lectura/routing.
 */
export async function getWorkerWriteSections(
  user: PortalUser
): Promise<Set<WorkerSectionHref>> {
  const status = await getWorkerAccessStatus(user)
  return status.writeSections
}
