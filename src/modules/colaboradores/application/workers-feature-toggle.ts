import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  getWorkerSettings,
  setWorkersEnabled,
  type WorkerSettingsRow,
} from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export async function getWorkersFeatureForClient(
  actor: PortalUser
): Promise<WorkerSettingsRow> {
  if (actor.role !== 'client') {
    return { workers_enabled: false, max_workers: 0 }
  }
  const ownerUserId = await resolveDirectoryActorId(actor)
  return getWorkerSettings(ownerUserId)
}

export type SetWorkersFeatureResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' }

export async function setWorkersFeatureForClient(
  actor: PortalUser,
  enabled: boolean
): Promise<SetWorkersFeatureResult> {
  if (actor.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }
  const ownerUserId = await resolveDirectoryActorId(actor)
  await setWorkersEnabled(ownerUserId, enabled)
  return { ok: true }
}
