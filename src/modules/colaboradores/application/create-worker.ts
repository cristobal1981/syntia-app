import type { PortalUser } from '@/src/modules/auth/domain/types'
import { createWorkerAccount } from '@/src/modules/colaboradores/infrastructure/worker-repository.supabase'
import {
  listWorkerGrantsForOwner,
  sanitizeAllowedSections,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import { getWorkerSettings } from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'
import type { CreateWorkerInput } from '@/src/modules/colaboradores/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

export type CreateWorkerForOwnerResult =
  | { ok: true; workerUserId: string; inviteSent: boolean }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'feature_disabled'
        | 'limit_reached'
        | 'duplicate_email'
        | 'create_failed'
    }

export async function createWorkerForOwner(
  actor: PortalUser,
  input: CreateWorkerInput
): Promise<CreateWorkerForOwnerResult> {
  if (actor.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const ownerUserId = await resolveDirectoryActorId(actor)

  const settings = await getWorkerSettings(ownerUserId)
  if (!settings.workers_enabled) {
    return { ok: false, error: 'feature_disabled' }
  }

  const existingGrants = await listWorkerGrantsForOwner(ownerUserId)
  if (existingGrants.length >= settings.max_workers) {
    return { ok: false, error: 'limit_reached' }
  }

  try {
    const { workerUserId, inviteSent } = await createWorkerAccount(
      ownerUserId,
      actor.companyName,
      {
        ...input,
        allowedSections: sanitizeAllowedSections(input.allowedSections),
      }
    )
    return { ok: true, workerUserId, inviteSent }
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_EMAIL') {
      return { ok: false, error: 'duplicate_email' }
    }
    console.error('[createWorkerForOwner] create_failed', error)
    return { ok: false, error: 'create_failed' }
  }
}
