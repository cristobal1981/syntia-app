import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { updateWorkerGrantForOwner } from '@/src/modules/colaboradores/application/update-worker-grant'

const { getWorkerGrant, upsertWorkerGrant, sanitizeAllowedSections, resolveDirectoryActorId } =
  vi.hoisted(() => ({
    getWorkerGrant: vi.fn(),
    upsertWorkerGrant: vi.fn(),
    sanitizeAllowedSections: vi.fn((sections: string[]) => sections),
    resolveDirectoryActorId: vi.fn(),
  }))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  getWorkerGrant,
  upsertWorkerGrant,
  sanitizeAllowedSections,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))

const clientA: PortalUser = { id: 'auth-a', email: 'a@example.com', name: 'Client A', role: 'client' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateWorkerGrantForOwner (IDOR guard)', () => {
  it('refuses a non-client actor outright', async () => {
    const worker: PortalUser = { id: 'w', email: 'w@example.com', name: 'W', role: 'worker' }

    const result = await updateWorkerGrantForOwner(worker, {
      workerUserId: 'worker-1',
      allowedSections: ['/tramites'],
      isEnabled: true,
    })

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getWorkerGrant).not.toHaveBeenCalled()
  })

  it('ATTACK: client A cannot edit client B\'s worker by guessing/reusing a workerUserId', async () => {
    resolveDirectoryActorId.mockResolvedValue('portal-client-a')
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'worker-of-b',
      owner_user_id: 'portal-client-b', // belongs to a different titular
      allowed_sections: ['/tramites'],
      is_enabled: true,
    })

    const result = await updateWorkerGrantForOwner(clientA, {
      workerUserId: 'worker-of-b',
      allowedSections: ['/documentos', '/firmas'],
      isEnabled: false,
    })

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(upsertWorkerGrant).not.toHaveBeenCalled()
  })

  it('returns not_found for a workerUserId with no grant at all (does not leak existence)', async () => {
    resolveDirectoryActorId.mockResolvedValue('portal-client-a')
    getWorkerGrant.mockResolvedValue(null)

    const result = await updateWorkerGrantForOwner(clientA, {
      workerUserId: 'nonexistent',
      allowedSections: ['/tramites'],
      isEnabled: true,
    })

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('allows a client to edit their own worker\'s grant', async () => {
    resolveDirectoryActorId.mockResolvedValue('portal-client-a')
    getWorkerGrant.mockResolvedValue({
      worker_user_id: 'worker-of-a',
      owner_user_id: 'portal-client-a',
      allowed_sections: ['/tramites'],
      is_enabled: true,
    })

    const result = await updateWorkerGrantForOwner(clientA, {
      workerUserId: 'worker-of-a',
      allowedSections: ['/documentos'],
      isEnabled: false,
    })

    expect(result).toEqual({ ok: true })
    expect(upsertWorkerGrant).toHaveBeenCalledWith({
      workerUserId: 'worker-of-a',
      ownerUserId: 'portal-client-a',
      allowedSections: ['/documentos'],
      isEnabled: false,
    })
  })
})
