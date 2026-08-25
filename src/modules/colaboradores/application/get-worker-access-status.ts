import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerGrant } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import { getWorkerSettings } from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type WorkerAccessStatus = {
  active: boolean
  allowedSections: Set<WorkerSectionHref>
}

/**
 * Fuente única de verdad de si un colaborador tiene acceso ahora mismo: el
 * grant debe estar activo Y el titular debe seguir teniendo la funcionalidad
 * encendida. Si el titular la desactiva, el colaborador pierde acceso al
 * instante — tanto a las secciones del portal como a cualquier acción
 * (crear consulta, iniciar sesión) que dependa de esto.
 */
export async function getWorkerAccessStatus(
  user: PortalUser
): Promise<WorkerAccessStatus> {
  const workerUserId = await resolveDirectoryActorId(user)
  const grant = await getWorkerGrant(workerUserId)
  if (!grant || !grant.is_enabled) {
    return { active: false, allowedSections: new Set() }
  }

  const ownerSettings = await getWorkerSettings(grant.owner_user_id)
  if (!ownerSettings.workers_enabled) {
    return { active: false, allowedSections: new Set() }
  }

  return {
    active: true,
    allowedSections: new Set(grant.allowed_sections as WorkerSectionHref[]),
  }
}
