import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  getWorkerGrant,
  sanitizeAllowedSections,
  upsertWorkerGrant,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import type { UpdateWorkerGrantInput } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type UpdateWorkerGrantResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' }

export async function updateWorkerGrantForOwner(
  actor: PortalUser,
  input: UpdateWorkerGrantInput
): Promise<UpdateWorkerGrantResult> {
  if (actor.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const ownerUserId = await resolveDirectoryActorId(actor)

  const grant = await getWorkerGrant(input.workerUserId)
  if (!grant || grant.owner_user_id !== ownerUserId) {
    return { ok: false, error: 'not_found' }
  }

  await upsertWorkerGrant({
    workerUserId: input.workerUserId,
    ownerUserId,
    allowedSections: sanitizeAllowedSections(input.allowedSections),
    isEnabled: input.isEnabled,
  })

  return { ok: true }
}
