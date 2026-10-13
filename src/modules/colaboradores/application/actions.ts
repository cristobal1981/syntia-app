'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import type { CreateWorkerForOwnerResult } from '@/src/modules/colaboradores/application/create-worker'
import { createWorkerForOwner } from '@/src/modules/colaboradores/application/create-worker'
import type { DeleteWorkerResult } from '@/src/modules/colaboradores/application/delete-worker'
import { deleteWorkerForOwner } from '@/src/modules/colaboradores/application/delete-worker'
import type { UpdateWorkerGrantResult } from '@/src/modules/colaboradores/application/update-worker-grant'
import { updateWorkerGrantForOwner } from '@/src/modules/colaboradores/application/update-worker-grant'
import type { SetWorkersFeatureResult } from '@/src/modules/colaboradores/application/workers-feature-toggle'
import { setWorkersFeatureForClient } from '@/src/modules/colaboradores/application/workers-feature-toggle'
import type {
  CreateWorkerInput,
  UpdateWorkerGrantInput,
} from '@/src/modules/colaboradores/domain/types'

export async function createWorkerAction(
  input: CreateWorkerInput
): Promise<CreateWorkerForOwnerResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'forbidden' }
  }
  return createWorkerForOwner(session.user, input)
}

export async function updateWorkerGrantAction(
  input: UpdateWorkerGrantInput
): Promise<UpdateWorkerGrantResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'forbidden' }
  }
  return updateWorkerGrantForOwner(session.user, input)
}

export async function deleteWorkerAction(
  workerUserId: string
): Promise<DeleteWorkerResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'forbidden' }
  }
  return deleteWorkerForOwner(session.user, workerUserId)
}

export async function setWorkersEnabledAction(
  enabled: boolean
): Promise<SetWorkersFeatureResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'forbidden' }
  }
  return setWorkersFeatureForClient(session.user, enabled)
}
