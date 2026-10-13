import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerGrant } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import { deleteWorkerAccount } from '@/src/modules/colaboradores/infrastructure/worker-repository.supabase'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type DeleteWorkerResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' }

export async function deleteWorkerForOwner(
  actor: PortalUser,
  workerUserId: string
): Promise<DeleteWorkerResult> {
  if (actor.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const ownerUserId = await resolveDirectoryActorId(actor)

  const grant = await getWorkerGrant(workerUserId)
  if (!grant || grant.owner_user_id !== ownerUserId) {
    return { ok: false, error: 'not_found' }
  }

  await deleteWorkerAccount(workerUserId)
  return { ok: true }
}
