'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type { DirectoryListScope } from '@/src/modules/directory/domain/types'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'

export async function requireDirectorySession() {
  const session = await getSession()
  if (!session) {
    throw new Error('unauthorized')
  }
  return session
}

export async function buildDirectoryScope(): Promise<DirectoryListScope> {
  const session = await requireDirectorySession()
  const actorId = await resolveDirectoryActorId(session.user)
  return {
    role: session.user.role,
    userId: actorId,
  }
}

export async function listGestoresAction() {
  const session = await requireDirectorySession()
  if (session.user.role !== 'admin') {
    throw new Error('forbidden')
  }
  return getDirectoryRepository().listGestores()
}

export async function listClientsAction() {
  const scope = await buildDirectoryScope()
  if (scope.role === 'client') {
    throw new Error('forbidden')
  }
  return getDirectoryRepository().listClients(scope)
}

export async function listAdvisorOptionsAction() {
  const session = await requireDirectorySession()
  if (session.user.role !== 'admin') {
    return []
  }
  return getDirectoryRepository().listAdvisorOptions()
}
