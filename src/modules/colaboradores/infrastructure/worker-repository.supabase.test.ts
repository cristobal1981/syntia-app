import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  createSupabaseAdminClient,
  createAuthUserForClient,
  isDuplicateEmailError,
  rollbackCreatedPortalUser,
  upsertProfile,
  getClientIntegrationByUserId,
  upsertClientIntegration,
  deleteClientIntegration,
  deleteWorkerGrant,
  upsertWorkerGrant,
  cloneChatterReadStateForUser,
  cloneWatchStateForUser,
  cloneTramitesListSeenStateForUser,
} = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createAuthUserForClient: vi.fn(),
  isDuplicateEmailError: vi.fn(() => false),
  rollbackCreatedPortalUser: vi.fn(),
  upsertProfile: vi.fn(),
  getClientIntegrationByUserId: vi.fn(),
  upsertClientIntegration: vi.fn(),
  deleteClientIntegration: vi.fn(),
  deleteWorkerGrant: vi.fn(),
  upsertWorkerGrant: vi.fn(),
  cloneChatterReadStateForUser: vi.fn(),
  cloneWatchStateForUser: vi.fn(),
  cloneTramitesListSeenStateForUser: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/directory/infrastructure/directory-repository.supabase', () => ({
  createAuthUserForClient,
  isDuplicateEmailError,
  rollbackCreatedPortalUser,
  upsertProfile,
}))
vi.mock('@/src/modules/directory/infrastructure/client-integrations.supabase', () => ({
  getClientIntegrationByUserId,
  upsertClientIntegration,
  deleteClientIntegration,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  deleteWorkerGrant,
  upsertWorkerGrant,
}))
vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({
  cloneChatterReadStateForUser,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({
  cloneWatchStateForUser,
}))
vi.mock('@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase', () => ({
  cloneTramitesListSeenStateForUser,
}))

import {
  createWorkerAccount,
  deleteWorkerAccount,
} from '@/src/modules/colaboradores/infrastructure/worker-repository.supabase'

import type { CreateWorkerInput } from '@/src/modules/colaboradores/domain/types'

const baseInput: CreateWorkerInput = {
  email: 'worker@example.com',
  firstName: 'W',
  firstSurname: 'One',
  secondSurname: '',
  allowedSections: ['/tramites'],
}

function usersChainFor(existingUser: unknown, insertResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.maybeSingle = () => Promise.resolve({ data: existingUser, error: null })
  chain.insert = () => chain
  chain.single = () => Promise.resolve(insertResult)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  isDuplicateEmailError.mockReturnValue(false)
  createAuthUserForClient.mockResolvedValue({ authUserId: 'auth-w1', inviteSent: true })
  getClientIntegrationByUserId.mockResolvedValue({
    odoo_partner_id: 555,
    drive_folder_id: 'owner-folder',
  })
})

describe('createWorkerAccount', () => {
  it('throws DUPLICATE_EMAIL at the pre-check without ever creating a Supabase Auth user', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor({ id: 'existing' }, { data: null, error: null }),
    })

    await expect(
      createWorkerAccount('owner-1', 'Acme', { ...baseInput })
    ).rejects.toThrow('DUPLICATE_EMAIL')

    expect(createAuthUserForClient).not.toHaveBeenCalled()
  })

  it("REUSES the titular's existing Odoo/Drive integration verbatim — never invents new values", async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor(null, { data: { id: 'new-worker-1' }, error: null }),
    })

    await createWorkerAccount('owner-1', 'Acme', { ...baseInput })

    expect(getClientIntegrationByUserId).toHaveBeenCalledWith('owner-1')
    expect(upsertClientIntegration).toHaveBeenCalledWith('new-worker-1', {
      odoo_partner_id: 555,
      drive_folder_id: 'owner-folder',
    })
  })

  it('when the titular has no integration row at all, the worker gets null/null — not undefined, not a crash', async () => {
    getClientIntegrationByUserId.mockResolvedValue(null)
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor(null, { data: { id: 'new-worker-1' }, error: null }),
    })

    await createWorkerAccount('owner-1', 'Acme', { ...baseInput })

    expect(upsertClientIntegration).toHaveBeenCalledWith('new-worker-1', {
      odoo_partner_id: null,
      drive_folder_id: null,
    })
  })

  it('creates the grant enabled with exactly the requested allowedSections, and clones the baseline read/watch/seen state from the titular', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor(null, { data: { id: 'new-worker-1' }, error: null }),
    })

    const result = await createWorkerAccount('owner-1', 'Acme', {
      ...baseInput,
      allowedSections: ['/documentos', '/firmas'],
    })

    expect(result).toEqual({ workerUserId: 'new-worker-1', inviteSent: true })
    expect(upsertWorkerGrant).toHaveBeenCalledWith({
      workerUserId: 'new-worker-1',
      ownerUserId: 'owner-1',
      allowedSections: ['/documentos', '/firmas'],
      isEnabled: true,
    })
    expect(cloneChatterReadStateForUser).toHaveBeenCalledWith('owner-1', 'new-worker-1')
    expect(cloneWatchStateForUser).toHaveBeenCalledWith('owner-1', 'new-worker-1')
    expect(cloneTramitesListSeenStateForUser).toHaveBeenCalledWith('owner-1', 'new-worker-1')
  })

  it('ROLLBACK: if the grant creation fails after the portal row exists, deletes the grant + integration + portal row + auth user', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor(null, { data: { id: 'new-worker-1' }, error: null }),
    })
    upsertWorkerGrant.mockRejectedValue(new Error('grant insert failed'))

    await expect(
      createWorkerAccount('owner-1', 'Acme', { ...baseInput })
    ).rejects.toThrow('grant insert failed')

    expect(deleteWorkerGrant).toHaveBeenCalledWith('new-worker-1')
    expect(deleteClientIntegration).toHaveBeenCalledWith('new-worker-1')
    expect(rollbackCreatedPortalUser).toHaveBeenCalledWith('auth-w1', 'new-worker-1')
  })

  it('ROLLBACK: if the portal row insert itself fails, no grant/integration cleanup is attempted (nothing to clean), but the auth user is still rolled back', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChainFor(null, { data: null, error: { message: 'insert failed' } }),
    })

    await expect(
      createWorkerAccount('owner-1', 'Acme', { ...baseInput })
    ).rejects.toThrow('insert failed')

    expect(deleteWorkerGrant).not.toHaveBeenCalled()
    expect(rollbackCreatedPortalUser).toHaveBeenCalledWith('auth-w1', undefined)
  })

  it('a duplicate-email error surfacing from the users insert (race with another request) is also mapped to DUPLICATE_EMAIL', async () => {
    isDuplicateEmailError.mockReturnValue(true)
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        usersChainFor(null, { data: null, error: { message: 'dup', code: 'email_exists' } }),
    })

    await expect(
      createWorkerAccount('owner-1', 'Acme', { ...baseInput })
    ).rejects.toThrow('DUPLICATE_EMAIL')
  })
})

describe('deleteWorkerAccount', () => {
  function usersRowChain(userRow: unknown) {
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.maybeSingle = () => Promise.resolve({ data: userRow, error: null })
    chain.delete = () => chain
    chain.then = (resolve: (v: unknown) => void) => resolve({ error: null })
    return chain
  }

  it('ATTACK: refuses to delete an id that does not belong to a worker (e.g. a client or gestor account)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersRowChain({ id: 'c1', auth_user_id: 'a1', role: 'client' }),
    })

    await expect(deleteWorkerAccount('c1')).rejects.toThrow('NOT_FOUND')
    expect(deleteWorkerGrant).not.toHaveBeenCalled()
  })

  it('deletes the grant and integration BEFORE the portal row, and the auth user last', async () => {
    const callOrder: string[] = []
    deleteWorkerGrant.mockImplementation(async () => {
      callOrder.push('deleteWorkerGrant')
    })
    deleteClientIntegration.mockImplementation(async () => {
      callOrder.push('deleteClientIntegration')
    })
    const deleteUser = vi.fn().mockImplementation(async () => {
      callOrder.push('deleteAuthUser')
      return { error: null }
    })
    const usersChain: Record<string, unknown> = {}
    usersChain.select = () => usersChain
    usersChain.eq = () => usersChain
    usersChain.maybeSingle = () =>
      Promise.resolve({ data: { id: 'w1', auth_user_id: 'a1', role: 'worker' }, error: null })
    usersChain.delete = () => usersChain
    usersChain.then = (resolve: (v: unknown) => void) => {
      callOrder.push('deletePortalUserRow')
      resolve({ error: null })
    }
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChain,
      auth: { admin: { deleteUser } },
    })

    await deleteWorkerAccount('w1')

    expect(callOrder).toEqual([
      'deleteWorkerGrant',
      'deleteClientIntegration',
      'deletePortalUserRow',
      'deleteAuthUser',
    ])
  })

  it('DELETE_AUTH_FAILED surfaces distinctly when the auth user deletion fails', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersRowChain({ id: 'w1', auth_user_id: 'a1', role: 'worker' }),
      auth: { admin: { deleteUser } },
    })

    await expect(deleteWorkerAccount('w1')).rejects.toThrow('DELETE_AUTH_FAILED')
  })

  it('does not attempt to delete an auth user when there was none linked', async () => {
    const deleteUser = vi.fn()
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersRowChain({ id: 'w1', auth_user_id: null, role: 'worker' }),
      auth: { admin: { deleteUser } },
    })

    await deleteWorkerAccount('w1')

    expect(deleteUser).not.toHaveBeenCalled()
  })
})
