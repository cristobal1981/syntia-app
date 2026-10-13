import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { createWorkerForOwner } from '@/src/modules/colaboradores/application/create-worker'
import type { CreateWorkerInput } from '@/src/modules/colaboradores/domain/types'

const {
  createWorkerAccount,
  listWorkerGrantsForOwner,
  sanitizeAllowedSections,
  getWorkerSettings,
  resolveDirectoryActorId,
} = vi.hoisted(() => ({
  createWorkerAccount: vi.fn(),
  listWorkerGrantsForOwner: vi.fn(),
  sanitizeAllowedSections: vi.fn((sections: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(sections).filter(([href]) =>
        ['/tramites', '/documentos', '/obligaciones', '/firmas', '/guias'].includes(href)
      )
    )
  ),
  getWorkerSettings: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
}))

vi.mock('@/src/modules/colaboradores/infrastructure/worker-repository.supabase', () => ({
  createWorkerAccount,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  listWorkerGrantsForOwner,
  sanitizeAllowedSections,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-settings.supabase', () => ({
  getWorkerSettings,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))

const clientA: PortalUser = {
  id: 'auth-a',
  email: 'a@example.com',
  name: 'A',
  role: 'client',
  companyName: 'Acme',
}

const baseInput: CreateWorkerInput = {
  email: 'newworker@example.com',
  firstName: 'New',
  firstSurname: 'Worker',
  secondSurname: '',
  allowedSections: { '/tramites': 'write' },
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveDirectoryActorId.mockResolvedValue('portal-client-a')
  createWorkerAccount.mockResolvedValue({ workerUserId: 'new-worker-1', inviteSent: true })
})

describe('createWorkerForOwner', () => {
  it('refuses a worker actor outright, before touching any DB table', async () => {
    const worker: PortalUser = { id: 'w', email: 'w@example.com', name: 'W', role: 'worker' }

    const result = await createWorkerForOwner(worker, { ...baseInput })

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getWorkerSettings).not.toHaveBeenCalled()
  })

  it('blocks creation when the feature is disabled, even if the worker count is well under the limit', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: false, max_workers: 5 })
    listWorkerGrantsForOwner.mockResolvedValue([])

    const result = await createWorkerForOwner(clientA, { ...baseInput })

    expect(result).toEqual({ ok: false, error: 'feature_disabled' })
    expect(createWorkerAccount).not.toHaveBeenCalled()
  })

  it('blocks creation at the exact limit boundary (existing count === max_workers)', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 2 })
    listWorkerGrantsForOwner.mockResolvedValue([{}, {}])

    const result = await createWorkerForOwner(clientA, { ...baseInput })

    expect(result).toEqual({ ok: false, error: 'limit_reached' })
    expect(createWorkerAccount).not.toHaveBeenCalled()
  })

  it('allows creation one below the limit boundary', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 2 })
    listWorkerGrantsForOwner.mockResolvedValue([{}])

    const result = await createWorkerForOwner(clientA, { ...baseInput })

    expect(result.ok).toBe(true)
  })

  it('SANITIZES allowedSections before persisting — a bogus/injected section string never reaches storage', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })
    listWorkerGrantsForOwner.mockResolvedValue([])

    await createWorkerForOwner(clientA, {
      ...baseInput,
      allowedSections: {
        '/tramites': 'write',
        '/__proto__': 'write',
        '/admin': 'write',
        'not-a-section': 'write',
      } as never,
    })

    expect(createWorkerAccount).toHaveBeenCalledWith(
      'portal-client-a',
      'Acme',
      expect.objectContaining({ allowedSections: { '/tramites': 'write' } })
    )
  })

  it('creates the worker under the ACTOR\'S OWN resolved owner id, never anything caller-supplied', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })
    listWorkerGrantsForOwner.mockResolvedValue([])

    await createWorkerForOwner(clientA, { ...baseInput })

    expect(getWorkerSettings).toHaveBeenCalledWith('portal-client-a')
    expect(listWorkerGrantsForOwner).toHaveBeenCalledWith('portal-client-a')
    expect(createWorkerAccount).toHaveBeenCalledWith('portal-client-a', 'Acme', expect.anything())
  })

  it('maps a duplicate-email failure from the repository to a clean duplicate_email result', async () => {
    getWorkerSettings.mockResolvedValue({ workers_enabled: true, max_workers: 5 })
    listWorkerGrantsForOwner.mockResolvedValue([])
    createWorkerAccount.mockRejectedValue(new Error('DUPLICATE_EMAIL'))

    const result = await createWorkerForOwner(clientA, { ...baseInput })

    expect(result).toEqual({ ok: false, error: 'duplicate_email' })
  })
})
