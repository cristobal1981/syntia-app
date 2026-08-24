import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerGrant } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import { getWorkerSettings } from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

/**
 * Un colaborador solo conserva acceso mientras su grant esté activo Y el
 * titular tenga la funcionalidad activada — si el titular la desactiva,
 * el colaborador pierde acceso al instante, no solo se bloquean altas nuevas.
 *
 * `user.id` es el UID de Supabase Auth, NO el `users.id` de la tabla portal
 * que referencian `worker_grants`/`client_integrations` — hay que resolverlo
 * primero con `resolveDirectoryActorId`.
 */
export async function getAllowedSectionsForWorker(
  user: PortalUser
): Promise<Set<WorkerSectionHref>> {
  const workerUserId = await resolveDirectoryActorId(user)
  const grant = await getWorkerGrant(workerUserId)
  if (!grant || !grant.is_enabled) {
    return new Set()
  }

  const ownerSettings = await getWorkerSettings(grant.owner_user_id)
  if (!ownerSettings.workers_enabled) {
    return new Set()
  }

  return new Set(grant.allowed_sections as WorkerSectionHref[])
}
