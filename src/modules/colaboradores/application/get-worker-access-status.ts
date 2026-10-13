import { cache } from 'react'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerGrant } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import {
  getWorkerSettings,
  isOwnerAccountActive,
} from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type WorkerAccessStatus = {
  active: boolean
  /** Cualquier nivel (lectura o escritura) — "puede ver esta sección". */
  allowedSections: Set<WorkerSectionHref>
  /** Solo nivel 'write' — "puede mutar dentro de esta sección". */
  writeSections: Set<WorkerSectionHref>
}

const EMPTY_STATUS: WorkerAccessStatus = {
  active: false,
  allowedSections: new Set(),
  writeSections: new Set(),
}

/**
 * Fuente única de verdad de si un colaborador tiene acceso ahora mismo: el
 * grant debe estar activo, el titular debe seguir teniendo la funcionalidad
 * encendida, Y la propia cuenta del titular (el cliente real) debe seguir
 * activa. Un colaborador nunca debe conservar acceso a datos de un cliente
 * archivado o desactivado, aunque su grant siga técnicamente "on" — si el
 * titular pierde acceso, el colaborador lo pierde con él.
 */
/** cache(): dedupe repeated calls (layout + page, per section, etc.) within one request. */
export const getWorkerAccessStatus = cache(async function getWorkerAccessStatus(
  user: PortalUser
): Promise<WorkerAccessStatus> {
  const workerUserId = await resolveDirectoryActorId(user)
  const grant = await getWorkerGrant(workerUserId)
  if (!grant || !grant.is_enabled) {
    return EMPTY_STATUS
  }

  const [ownerSettings, ownerActive] = await Promise.all([
    getWorkerSettings(grant.owner_user_id),
    isOwnerAccountActive(grant.owner_user_id),
  ])
  if (!ownerSettings.workers_enabled || !ownerActive) {
    return EMPTY_STATUS
  }

  const entries = Object.entries(grant.allowed_sections) as [WorkerSectionHref, string][]

  return {
    active: true,
    allowedSections: new Set(entries.map(([href]) => href)),
    writeSections: new Set(entries.filter(([, level]) => level === 'write').map(([href]) => href)),
  }
})
