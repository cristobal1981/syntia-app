import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { createSupabaseAdminClient, propagateOwnerIntegrationToWorkers } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  propagateOwnerIntegrationToWorkers: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/colaboradores/infrastructure/worker-grants.supabase', () => ({
  propagateOwnerIntegrationToWorkers,
}))
const { sendClientAccessEmailForClient } = vi.hoisted(() => ({
  sendClientAccessEmailForClient: vi.fn(),
}))
vi.mock('@/src/modules/directory/infrastructure/client-access-link', () => ({
  deliverClientAccessEmail: vi.fn(),
  getPortalAccessRedirectUrl: () => 'https://portal.example.com/login/restablecer',
  sendClientAccessEmailForClient,
}))
const { isResendConfigured, shouldSkipClientInviteEmail, shouldUseResendClientInvite } =
  vi.hoisted(() => ({
    isResendConfigured: vi.fn(() => false),
    shouldSkipClientInviteEmail: vi.fn(() => false),
    shouldUseResendClientInvite: vi.fn(() => false),
  }))
vi.mock('@/src/modules/email/infrastructure/resend-env', () => ({ isResendConfigured }))
vi.mock('@/src/modules/directory/infrastructure/directory-env', () => ({
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
}))
vi.mock('@/src/modules/directory/infrastructure/client-integrations.supabase', () => ({
  deleteClientIntegration: vi.fn(),
  fetchClientIntegrationMap: vi.fn().mockResolvedValue(new Map()),
  upsertClientIntegration: vi.fn(),
}))

import {
  createAuthUserForClient,
  isDuplicateEmailError,
  rollbackCreatedPortalUser,
  supabaseDirectoryRepository,
  upsertProfile,
} from '@/src/modules/directory/infrastructure/directory-repository.supabase'
import {
  deleteClientIntegration,
  fetchClientIntegrationMap,
  upsertClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'

/**
 * A single admin client shared across every `createSupabaseAdminClient()`
 * call (fetchUserMap / fetchProfileMap / client-integrations.supabase.ts's
 * own call — all import the same mocked module). `.from(table)` dispatches
 * by table name and returns the FULL canned dataset regardless of `.in()`/
 * `.eq()` filters — valid here because `listClients`/`listGestores` never
 * pass `ids` to `buildDirectorySources`, so the real `.in()` filter is never
 * actually invoked; the id-scoping happens entirely client-side in
 * `buildDirectorySources`'s own `.map()`/`.filter()`.
 */
function makeAdminClient(tables: Record<string, unknown[]>) {
  return {
    from: (table: string) => {
      const rows = tables[table] ?? []
      const resolved = Promise.resolve({ data: rows, error: null })
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.in = () => chain
      chain.eq = () => chain
      chain.not = () => chain
      chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        resolved.then(resolve, reject)
      return chain
    },
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  // vi.resetAllMocks() also wipes the mockResolvedValue/implementation
  // configured inside vi.mock(...) factories and vi.hoisted() defaults
  // above — must be re-armed every test, not just once at module load.
  vi.mocked(fetchClientIntegrationMap).mockResolvedValue(new Map())
  isResendConfigured.mockReturnValue(false)
  shouldSkipClientInviteEmail.mockReturnValue(false)
  shouldUseResendClientInvite.mockReturnValue(false)
})

describe('isDuplicateEmailError', () => {
  // FIXED 2026-08-25: previously matched only on `message` substrings, which
  // is fragile against Supabase's exact wording (the Postgrest SDK's own
  // docs literally say "branch on [code] rather than on message text").
  // Now checks the STABLE error codes first — Supabase Auth's
  // `email_exists`/`user_already_exists` (confirmed via
  // @supabase/auth-js's GoTrueClient docstring + error-codes.ts) and
  // Postgres' `23505` unique_violation (returned by Postgrest on a unique
  // constraint hit, e.g. inserting a `users` row with a duplicate email) —
  // and only falls back to the message heuristic when no code is present.
  it.each(['email_exists', 'user_already_exists', '23505'])(
    'recognizes the stable code "%s" as duplicate-email REGARDLESS of message wording',
    (code) => {
      expect(
        isDuplicateEmailError({ message: 'some totally unrelated wording', code })
      ).toBe(true)
    }
  )

  it('a code that is NOT one of the known duplicate-email codes falls through to the message check', () => {
    expect(isDuplicateEmailError({ message: 'connection timeout', code: '08006' })).toBe(false)
  })

  it('still accepts a plain string (message-only) for backward compatibility with existing call sites', () => {
    expect(isDuplicateEmailError('User already registered')).toBe(true)
  })

  it.each([
    'User Already Registered',
    'duplicate key value violates unique constraint',
    'Unique_Violation',
    'this email already exists',
  ])('message-only fallback recognizes %s as duplicate-email (case-insensitive)', (message) => {
    expect(isDuplicateEmailError(message)).toBe(true)
  })

  it('does not misclassify an unrelated error as duplicate-email', () => {
    expect(isDuplicateEmailError('connection timeout')).toBe(false)
    expect(isDuplicateEmailError({ message: 'connection timeout' })).toBe(false)
  })

  it('the message-only fallback is still fragile against exact wording drift (e.g. "already been registered" vs "already registered") — this is exactly why the code check now runs first', () => {
    expect(
      isDuplicateEmailError('A user with this email address has already been registered')
    ).toBe(false)
  })
})

describe('listClients — advisor visibility scoping', () => {
  const users: unknown[] = [
    { id: 'client-a', email: 'a@example.com', role: 'client', status: 'active', is_active: true, odoo_user_id: null },
    { id: 'client-b', email: 'b@example.com', role: 'client', status: 'active', is_active: true, odoo_user_id: null },
    { id: 'client-orphan', email: 'orphan@example.com', role: 'client', status: 'active', is_active: true, odoo_user_id: null },
  ]
  const profiles: unknown[] = [
    { user_id: 'client-a', first_name: 'Alice', first_surname: 'A', second_surname: '', phone: null, company_name: null, advisor_id: 'advisor-1', vat: null, iban: null, address_line1: null, address_line2: null, postal_code: null, city: null, province: null, country: null },
    { user_id: 'client-b', first_name: 'Bob', first_surname: 'B', second_surname: '', phone: null, company_name: null, advisor_id: 'advisor-2', vat: null, iban: null, address_line1: null, address_line2: null, postal_code: null, city: null, province: null, country: null },
    // client-orphan has NO profile row at all -> no advisor_id
  ]

  beforeEach(() => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({ users, profiles, client_integrations: [] })
    )
  })

  it('an admin sees every client regardless of assigned advisor', async () => {
    const result = await supabaseDirectoryRepository.listClients({
      role: 'admin',
      userId: 'admin-1',
    })

    expect(result.map((c) => c.id).sort()).toEqual(['client-a', 'client-b', 'client-orphan'])
  })

  it("SECURITY: an advisor sees ONLY clients assigned to them, not their colleague's or unassigned clients", async () => {
    const result = await supabaseDirectoryRepository.listClients({
      role: 'advisor',
      userId: 'advisor-1',
    })

    expect(result.map((c) => c.id)).toEqual(['client-a'])
  })

  it('a client with no advisor_id at all is excluded from an advisor\'s scoped view (fails closed, not open)', async () => {
    const result = await supabaseDirectoryRepository.listClients({
      role: 'advisor',
      userId: 'advisor-1',
    })

    expect(result.map((c) => c.id)).not.toContain('client-orphan')
  })

  it("a different advisor's scoped view is disjoint from the first advisor's", async () => {
    const result = await supabaseDirectoryRepository.listClients({
      role: 'advisor',
      userId: 'advisor-2',
    })

    expect(result.map((c) => c.id)).toEqual(['client-b'])
  })
})

describe('deleteGestor / deleteClient — cross-role IDOR guard', () => {
  it('ATTACK: deleteClient refuses to delete an id that actually belongs to a gestor account', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.maybeSingle = () =>
          Promise.resolve({
            data: { id: 'gestor-1', auth_user_id: 'auth-1', role: 'advisor' },
            error: null,
          })
        return chain
      },
      auth: { admin: { deleteUser: vi.fn() } },
    })

    await expect(supabaseDirectoryRepository.deleteClient('gestor-1')).rejects.toThrow(
      'NOT_FOUND'
    )
  })

  it('ATTACK: deleteGestor refuses to delete an id that actually belongs to a client account', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.maybeSingle = () =>
          Promise.resolve({
            data: { id: 'client-1', auth_user_id: 'auth-1', role: 'client' },
            error: null,
          })
        return chain
      },
      auth: { admin: { deleteUser: vi.fn() } },
    })

    await expect(supabaseDirectoryRepository.deleteGestor('client-1')).rejects.toThrow(
      'NOT_FOUND'
    )
  })

  it('deleting a client with a linked auth account also deletes the Supabase Auth user', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const usersChain: Record<string, unknown> = {}
    usersChain.select = () => usersChain
    usersChain.eq = () => usersChain
    usersChain.maybeSingle = () =>
      Promise.resolve({
        data: { id: 'client-1', auth_user_id: 'auth-99', role: 'client' },
        error: null,
      })
    usersChain.delete = () => usersChain
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChain,
      auth: { admin: { deleteUser } },
    })

    await supabaseDirectoryRepository.deleteClient('client-1')

    expect(deleteUser).toHaveBeenCalledWith('auth-99')
  })

  it('DELETE_AUTH_FAILED surfaces distinctly when the portal row is already gone but the auth user delete fails (partial-failure state)', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    const usersChain: Record<string, unknown> = {}
    usersChain.select = () => usersChain
    usersChain.eq = () => usersChain
    usersChain.maybeSingle = () =>
      Promise.resolve({
        data: { id: 'client-1', auth_user_id: 'auth-99', role: 'client' },
        error: null,
      })
    usersChain.delete = () => usersChain
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChain,
      auth: { admin: { deleteUser } },
    })

    await expect(supabaseDirectoryRepository.deleteClient('client-1')).rejects.toThrow(
      'DELETE_AUTH_FAILED'
    )
  })
})

describe('rollbackCreatedPortalUser', () => {
  it('deletes the client_integrations row, then the portal user row, then the auth user — in that order', async () => {
    const callOrder: string[] = []
    vi.mocked(deleteClientIntegration).mockImplementation(async () => {
      callOrder.push('deleteClientIntegration')
    })
    const deleteUser = vi.fn().mockImplementation(async () => {
      callOrder.push('deleteAuthUser')
      return { error: null }
    })
    const usersChain: Record<string, unknown> = {}
    usersChain.delete = () => usersChain
    usersChain.eq = vi.fn(() => {
      callOrder.push('deletePortalUserRow')
      return Promise.resolve({ error: null })
    })
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChain,
      auth: { admin: { deleteUser } },
    })

    await rollbackCreatedPortalUser('auth-1', 'portal-1')

    expect(callOrder).toEqual(['deleteClientIntegration', 'deletePortalUserRow', 'deleteAuthUser'])
  })

  it('still deletes the auth user even when no portal row was ever created (rollback right after auth-user creation failed)', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(),
      auth: { admin: { deleteUser } },
    })

    await rollbackCreatedPortalUser('auth-1', undefined)

    expect(deleteUser).toHaveBeenCalledWith('auth-1')
  })
})

describe('createAuthUserForClient (3-way invite delivery + dev-only rate-limit fallback)', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv })
  })

  function adminClientWithAuth(auth: Record<string, unknown>) {
    return { from: vi.fn(), auth: { admin: auth } }
  }

  it('PRIORITY: the dev skip-invite flag wins even when Resend is ALSO configured', async () => {
    shouldSkipClientInviteEmail.mockReturnValue(true)
    shouldUseResendClientInvite.mockReturnValue(true)
    isResendConfigured.mockReturnValue(true)
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue(adminClientWithAuth({ createUser }))

    const result = await createAuthUserForClient('user@example.com')

    expect(result).toEqual({ authUserId: 'auth-1', inviteSent: false })
    expect(createUser).toHaveBeenCalledWith({ email: 'user@example.com', email_confirm: true })
  })

  it('Resend path throws RESEND_NOT_CONFIGURED without ever touching Supabase when the API key is missing', async () => {
    shouldUseResendClientInvite.mockReturnValue(true)
    isResendConfigured.mockReturnValue(false)

    await expect(createAuthUserForClient('user@example.com')).rejects.toThrow(
      'RESEND_NOT_CONFIGURED'
    )
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('Resend path generates an invite link and reports inviteSent: true', async () => {
    shouldUseResendClientInvite.mockReturnValue(true)
    isResendConfigured.mockReturnValue(true)
    const generateLink = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-2' }, properties: { hashed_token: 'tok' } },
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue(adminClientWithAuth({ generateLink }))

    const result = await createAuthUserForClient('user@example.com')

    expect(result).toEqual({ authUserId: 'auth-2', inviteSent: true })
  })

  it('default (native Supabase invite) path succeeds and reports inviteSent: true', async () => {
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-3' } },
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue(adminClientWithAuth({ inviteUserByEmail }))

    const result = await createAuthUserForClient('user@example.com')

    expect(result).toEqual({ authUserId: 'auth-3', inviteSent: true })
  })

  it('default path maps a duplicate-email error to DUPLICATE_EMAIL', async () => {
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', code: 'email_exists' },
    })
    createSupabaseAdminClient.mockReturnValue(adminClientWithAuth({ inviteUserByEmail }))

    await expect(createAuthUserForClient('user@example.com')).rejects.toThrow('DUPLICATE_EMAIL')
  })

  it('default path maps a rate-limit error to EMAIL_RATE_LIMIT in production (NODE_ENV != development)', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' })
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Email rate limit exceeded' },
    })
    const createUser = vi.fn()
    createSupabaseAdminClient.mockReturnValue(
      adminClientWithAuth({ inviteUserByEmail, createUser })
    )

    await expect(createAuthUserForClient('user@example.com')).rejects.toThrow('EMAIL_RATE_LIMIT')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('SECURITY-RELEVANT: a rate-limit error silently falls back to creating the account WITHOUT sending any invite — but ONLY when NODE_ENV is exactly "development"', async () => {
    Object.assign(process.env, { NODE_ENV: 'development' })
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Email rate limit exceeded' },
    })
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-dev' } },
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue(
      adminClientWithAuth({ inviteUserByEmail, createUser })
    )

    const result = await createAuthUserForClient('user@example.com')

    expect(result).toEqual({ authUserId: 'auth-dev', inviteSent: false })
    expect(createUser).toHaveBeenCalled()
  })

  it('a non-development NODE_ENV value that merely CONTAINS "development" (e.g. "development2") is NOT treated as development — exact match only', async () => {
    Object.assign(process.env, { NODE_ENV: 'development2' })
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Email rate limit exceeded' },
    })
    const createUser = vi.fn()
    createSupabaseAdminClient.mockReturnValue(
      adminClientWithAuth({ inviteUserByEmail, createUser })
    )

    await expect(createAuthUserForClient('user@example.com')).rejects.toThrow('EMAIL_RATE_LIMIT')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('default path propagates any other Supabase error message as-is', async () => {
    const inviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'SMTP relay down' },
    })
    createSupabaseAdminClient.mockReturnValue(adminClientWithAuth({ inviteUserByEmail }))

    await expect(createAuthUserForClient('user@example.com')).rejects.toThrow('SMTP relay down')
  })
})

describe('resendClientAccessEmail / resendGestorAccessEmail', () => {
  function makeClientForResend(userRow: unknown, updateUserById = vi.fn()) {
    return {
      from: () => {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.maybeSingle = () => Promise.resolve({ data: userRow, error: null })
        return chain
      },
      auth: { admin: { updateUserById } },
    }
  }

  it('resendClientAccessEmail: NOT_FOUND when the id belongs to a gestor, not a client', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend({ id: 'g1', email: 'g@x.com', auth_user_id: 'a1', role: 'advisor', status: 'active' })
    )

    await expect(supabaseDirectoryRepository.resendClientAccessEmail('g1')).rejects.toThrow(
      'NOT_FOUND'
    )
  })

  it('resendClientAccessEmail: NO_AUTH_ACCOUNT when there is no linked Supabase Auth user', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend({ id: 'c1', email: 'c@x.com', auth_user_id: null, role: 'client', status: 'invited' })
    )

    await expect(supabaseDirectoryRepository.resendClientAccessEmail('c1')).rejects.toThrow(
      'NO_AUTH_ACCOUNT'
    )
  })

  it('resendClientAccessEmail: ACCOUNT_ARCHIVED refuses to send access to an archived account — verified it never reaches the email step', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend({ id: 'c1', email: 'c@x.com', auth_user_id: 'a1', role: 'client', status: 'archived' })
    )

    await expect(supabaseDirectoryRepository.resendClientAccessEmail('c1')).rejects.toThrow(
      'ACCOUNT_ARCHIVED'
    )
    expect(sendClientAccessEmailForClient).not.toHaveBeenCalled()
  })

  it('resendClientAccessEmail: an ACTIVE account gets its password reset before the email is sent (invalidates any existing session)', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend(
        { id: 'c1', email: 'c@x.com', auth_user_id: 'a1', role: 'client', status: 'active' },
        updateUserById
      )
    )

    await supabaseDirectoryRepository.resendClientAccessEmail('c1')

    expect(updateUserById).toHaveBeenCalledWith('a1', { password: expect.any(String) })
    expect(sendClientAccessEmailForClient).toHaveBeenCalledWith('c@x.com')
  })

  it('resendClientAccessEmail: an INVITED (not yet active) account skips the password reset entirely, but still sends the email', async () => {
    const updateUserById = vi.fn()
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend(
        { id: 'c1', email: 'c@x.com', auth_user_id: 'a1', role: 'client', status: 'invited' },
        updateUserById
      )
    )

    await supabaseDirectoryRepository.resendClientAccessEmail('c1')

    expect(updateUserById).not.toHaveBeenCalled()
    expect(sendClientAccessEmailForClient).toHaveBeenCalledWith('c@x.com')
  })

  it('resendClientAccessEmail: PASSWORD_RESET_FAILED surfaces distinctly and never sends the email', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend(
        { id: 'c1', email: 'c@x.com', auth_user_id: 'a1', role: 'client', status: 'active' },
        updateUserById
      )
    )

    await expect(supabaseDirectoryRepository.resendClientAccessEmail('c1')).rejects.toThrow(
      'PASSWORD_RESET_FAILED'
    )
    expect(sendClientAccessEmailForClient).not.toHaveBeenCalled()
  })

  it('resendGestorAccessEmail: NOT_FOUND when the id belongs to a client, not a gestor', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend({ id: 'c1', email: 'c@x.com', auth_user_id: 'a1', role: 'client', status: 'active' })
    )

    await expect(supabaseDirectoryRepository.resendGestorAccessEmail('c1')).rejects.toThrow(
      'NOT_FOUND'
    )
  })

  it('resendGestorAccessEmail: ACCOUNT_ARCHIVED applies to gestores too, not just clients', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeClientForResend({ id: 'g1', email: 'g@x.com', auth_user_id: 'a1', role: 'admin', status: 'archived' })
    )

    await expect(supabaseDirectoryRepository.resendGestorAccessEmail('g1')).rejects.toThrow(
      'ACCOUNT_ARCHIVED'
    )
    expect(sendClientAccessEmailForClient).not.toHaveBeenCalled()
  })
})

describe('createGestor / createClient — rollback on partial failure', () => {
  /**
   * Simulates the full create flow's admin client: the existing-email
   * check, `createAuthUserForClient`'s native-invite path (default flags),
   * the `users` insert, and a `profiles` upsert that FAILS — exercising
   * the exact path that must trigger `rollbackCreatedPortalUser` so no
   * orphaned Supabase Auth user (or portal row) is left behind.
   */
  function makeFailingProfileClient() {
    const usersChain: Record<string, unknown> = {}
    usersChain.select = () => usersChain
    usersChain.eq = () => usersChain
    usersChain.maybeSingle = () => Promise.resolve({ data: null, error: null }) // no existing user
    usersChain.insert = () => usersChain
    usersChain.single = () =>
      Promise.resolve({ data: { id: 'new-portal-id' }, error: null })
    usersChain.delete = () => usersChain
    usersChain.then = (resolve: (v: unknown) => void) => resolve({ error: null }) // rollback's delete

    const profilesChain: Record<string, unknown> = {}
    profilesChain.upsert = () =>
      Promise.resolve({ error: { message: 'profiles insert failed: RLS denied' } })

    const inviteUserByEmail = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'auth-new-id' } }, error: null })
    const deleteUser = vi.fn().mockResolvedValue({ error: null })

    return {
      from: (table: string) => (table === 'users' ? usersChain : profilesChain),
      auth: { admin: { inviteUserByEmail, deleteUser } },
    }
  }

  it('createGestor: a failed profile upsert rolls back BOTH the portal user row and the just-created Supabase Auth user', async () => {
    const client = makeFailingProfileClient()
    createSupabaseAdminClient.mockReturnValue(client)

    await expect(
      supabaseDirectoryRepository.createGestor({
        firstName: 'Ana',
        firstSurname: 'Gómez',
        email: 'ana@example.com',
        role: 'advisor',
      })
    ).rejects.toThrow('profiles insert failed')

    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith('auth-new-id')
    expect(deleteClientIntegration).toHaveBeenCalledWith('new-portal-id')
  })

  it('createClient: same rollback guarantee applies to the client creation path', async () => {
    const client = makeFailingProfileClient()
    createSupabaseAdminClient.mockReturnValue(client)

    await expect(
      supabaseDirectoryRepository.createClient({
        clientKind: 'person',
        firstName: 'Bea',
        firstSurname: 'López',
        email: 'bea@example.com',
      })
    ).rejects.toThrow('profiles insert failed')

    expect(client.auth.admin.deleteUser).toHaveBeenCalledWith('auth-new-id')
  })

  it('createGestor: a duplicate email caught at the pre-check throws DUPLICATE_EMAIL WITHOUT ever creating a Supabase Auth user (nothing to roll back)', async () => {
    const usersChain: Record<string, unknown> = {}
    usersChain.select = () => usersChain
    usersChain.eq = () => usersChain
    usersChain.maybeSingle = () => Promise.resolve({ data: { id: 'existing-1' }, error: null })
    const inviteUserByEmail = vi.fn()
    createSupabaseAdminClient.mockReturnValue({
      from: () => usersChain,
      auth: { admin: { inviteUserByEmail } },
    })

    await expect(
      supabaseDirectoryRepository.createGestor({
        firstName: 'Ana',
        firstSurname: 'Gómez',
        email: 'ana@example.com',
        role: 'advisor',
      })
    ).rejects.toThrow('DUPLICATE_EMAIL')

    expect(inviteUserByEmail).not.toHaveBeenCalled()
  })
})

function gestorUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    email: 'g1@example.com',
    role: 'advisor',
    status: 'active',
    is_active: true,
    odoo_user_id: null,
    ...overrides,
  }
}

function clientUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    email: 'c1@example.com',
    role: 'client',
    status: 'active',
    is_active: true,
    odoo_user_id: null,
    ...overrides,
  }
}

function profileRow(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    user_id: userId,
    first_name: 'Nombre',
    first_surname: 'Apellido',
    second_surname: '',
    phone: null,
    company_name: null,
    advisor_id: null,
    vat: null,
    iban: null,
    address_line1: null,
    address_line2: null,
    postal_code: null,
    city: null,
    province: null,
    country: null,
    ...overrides,
  }
}

describe('listGestores / getGestor / getClient / listAdvisorOptions (read paths)', () => {
  it('listGestores excludes non-gestor roles and sorts alphabetically', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({
        users: [
          gestorUser({ id: 'g-zeta' }),
          gestorUser({ id: 'g-alpha' }),
          clientUser({ id: 'not-a-gestor' }), // must be excluded
        ],
        profiles: [
          profileRow('g-zeta', { first_name: 'Zeta' }),
          profileRow('g-alpha', { first_name: 'Alpha' }),
          profileRow('not-a-gestor', { first_name: 'Cliente' }),
        ],
        client_integrations: [],
      })
    )

    const result = await supabaseDirectoryRepository.listGestores()

    expect(result.map((g) => g.id)).toEqual(['g-alpha', 'g-zeta'])
  })

  it('getGestor returns null for an id with no matching user row', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({ users: [], profiles: [], client_integrations: [] })
    )

    expect(await supabaseDirectoryRepository.getGestor('missing')).toBeNull()
  })

  it('getClient resolves the assigned advisor\'s display name via a second lookup', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({
        users: [clientUser({ id: 'c1' }), gestorUser({ id: 'adv-1' })],
        profiles: [
          profileRow('c1', { advisor_id: 'adv-1' }),
          profileRow('adv-1', { first_name: 'Asesora', first_surname: 'X' }),
        ],
        client_integrations: [],
      })
    )

    const result = await supabaseDirectoryRepository.getClient('c1')

    expect(result?.advisorName).toBe('Asesora X')
  })

  it('getClient leaves advisorName undefined when no advisor is assigned', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({
        users: [clientUser({ id: 'c1' })],
        profiles: [profileRow('c1', { advisor_id: null })],
        client_integrations: [],
      })
    )

    const result = await supabaseDirectoryRepository.getClient('c1')

    expect(result?.advisorName).toBeUndefined()
  })

  it('getClient returns null for an id with no matching user row', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({ users: [], profiles: [], client_integrations: [] })
    )

    expect(await supabaseDirectoryRepository.getClient('missing')).toBeNull()
  })

  it('listAdvisorOptions maps listGestores down to just {id, name}', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeAdminClient({
        users: [gestorUser({ id: 'g1' })],
        profiles: [profileRow('g1', { first_name: 'Ana', first_surname: 'B' })],
        client_integrations: [],
      })
    )

    const result = await supabaseDirectoryRepository.listAdvisorOptions()

    expect(result).toEqual([{ id: 'g1', name: 'Ana B' }])
  })
})

describe('upsertProfile', () => {
  it('upserts keyed on user_id (onConflict), stamping updated_at', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ upsert }) })

    await upsertProfile('u1', { first_name: 'Ana' })

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        first_name: 'Ana',
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    )
  })

  it('throws on a DB error', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ upsert }) })

    await expect(upsertProfile('u1', {})).rejects.toThrow('boom')
  })
})

describe('updateGestor / updateClient', () => {
  /**
   * `users` and `profiles` each get used for TWO different purposes within
   * one call: a write (`.update()`/via `upsertProfile`'s `.upsert()`) and
   * then a read-back (`this.getGestor`/`this.getClient` → `buildDirectorySources`).
   * The chain tracks which verb started the call to answer each correctly.
   */
  function makeUpdateClient(opts: {
    updateError?: { message: string } | null
    profileUpsertError?: { message: string } | null
    userRow: unknown
    profileRow: unknown
  }) {
    const usersChain: Record<string, unknown> = {}
    let usersIsUpdate = false
    usersChain.update = () => {
      usersIsUpdate = true
      return usersChain
    }
    usersChain.select = () => {
      usersIsUpdate = false
      return usersChain
    }
    usersChain.eq = () => usersChain
    usersChain.in = () => usersChain
    usersChain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
      const result = usersIsUpdate
        ? { error: opts.updateError ?? null }
        : { data: [opts.userRow], error: null }
      return Promise.resolve(result).then(resolve, reject)
    }

    const profilesChain: Record<string, unknown> = {}
    profilesChain.upsert = () =>
      Promise.resolve({ error: opts.profileUpsertError ?? null })
    profilesChain.select = () => profilesChain
    profilesChain.in = () => profilesChain
    profilesChain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve({ data: [opts.profileRow], error: null }).then(resolve, reject)

    return { from: (table: string) => (table === 'users' ? usersChain : profilesChain) }
  }

  it('updateGestor writes the users row, upserts the profile, and returns the freshly read-back gestor', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeUpdateClient({
        userRow: gestorUser({ id: 'g1', role: 'admin', status: 'active' }),
        profileRow: profileRow('g1', { first_name: 'Actualizado' }),
      })
    )

    const result = await supabaseDirectoryRepository.updateGestor({
      id: 'g1',
      firstName: 'Actualizado',
      firstSurname: 'Apellido',
      email: 'g1@example.com',
      role: 'admin',
      status: 'active',
    })

    expect(result.name).toBe('Actualizado Apellido')
  })

  it('updateGestor throws immediately on a users-table update error, without ever touching the profile', async () => {
    const client = makeUpdateClient({
      updateError: { message: 'update failed' },
      userRow: gestorUser(),
      profileRow: profileRow('g1'),
    })
    createSupabaseAdminClient.mockReturnValue(client)

    await expect(
      supabaseDirectoryRepository.updateGestor({
        id: 'g1',
        firstName: 'A',
        firstSurname: 'B',
        email: 'g1@example.com',
        role: 'admin',
        status: 'active',
      })
    ).rejects.toThrow('update failed')
  })

  it('updateClient also upserts the Odoo/Drive integration AND propagates it to that client\'s colaboradores', async () => {
    createSupabaseAdminClient.mockReturnValue(
      makeUpdateClient({
        userRow: clientUser({ id: 'c1' }),
        profileRow: profileRow('c1'),
      })
    )

    await supabaseDirectoryRepository.updateClient({
      id: 'c1',
      clientKind: 'person',
      firstName: 'A',
      firstSurname: 'B',
      email: 'c1@example.com',
      status: 'active',
      odooPartnerId: '123',
      driveFolderId: 'folder-1',
    })

    expect(upsertClientIntegration).toHaveBeenCalledWith('c1', {
      odoo_partner_id: 123,
      drive_folder_id: 'folder-1',
    })
    expect(propagateOwnerIntegrationToWorkers).toHaveBeenCalledWith('c1', {
      odoo_partner_id: 123,
      drive_folder_id: 'folder-1',
    })
  })
})
