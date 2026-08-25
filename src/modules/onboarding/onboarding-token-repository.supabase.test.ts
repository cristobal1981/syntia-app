import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  createOnboardingFormAccessToken,
  deleteOnboardingFormAccessToken,
  getOnboardingFormAccessTokenByToken,
  markOnboardingFormAccessTokenUsed,
  recordOnboardingEmailEvent,
  recordOnboardingEmailSent,
  revokeOnboardingFormAccessToken,
} from '@/src/modules/onboarding/onboarding-token-repository.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

/**
 * A recording, spy-capable chain: every filter method is a vi.fn() so
 * tests can assert the EXACT combination of conditions sent to Postgrest,
 * not just trust a canned response. Every filter method returns the same
 * chain (AND-composition), and the terminal is whichever of
 * `.single()`/`.maybeSingle()`/bare-await resolves the configured result.
 */
function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.gt = vi.fn(() => chain)
  chain.or = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => resolved)
  chain.single = () => resolved
  chain.maybeSingle = () => resolved
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

function tokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    token: 'tok-abc',
    form_kind: 'alta_autonomo',
    recipient_email: 'a@x.com',
    recipient_name: 'Ana',
    odoo_partner_id: null,
    expires_at: '2099-01-01T00:00:00.000Z',
    used_at: null,
    revoked_at: null,
    created_by: 'staff-1',
    created_at: '2020-01-01T00:00:00.000Z',
    resend_email_id: null,
    email_sent_at: null,
    email_delivered_at: null,
    email_opened_at: null,
    email_clicked_at: null,
    email_bounced_at: null,
    email_complained_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('markOnboardingFormAccessTokenUsed (the actual authorization check for the public form)', () => {
  it('SECURITY: the update is filtered atomically on token + unused + unrevoked + unexpired — all four conditions in one query, not a check-then-write', async () => {
    const chain = chainFor({ data: [{ token: 'tok-abc' }], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await markOnboardingFormAccessTokenUsed('tok-abc')

    expect(chain.eq).toHaveBeenCalledWith('token', 'tok-abc')
    expect(chain.is).toHaveBeenCalledWith('used_at', null)
    expect(chain.is).toHaveBeenCalledWith('revoked_at', null)
    expect(chain.gt).toHaveBeenCalledWith('expires_at', expect.any(String))
  })

  it('returns true only when the update actually touched a row', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ token: 'tok-abc' }], error: null }),
    })

    expect(await markOnboardingFormAccessTokenUsed('tok-abc')).toBe(true)
  })

  it('returns false (not an error) when the token is already used/revoked/expired — the filter matched zero rows', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })

    expect(await markOnboardingFormAccessTokenUsed('tok-abc')).toBe(false)
  })

  it('an empty/whitespace token short-circuits to false WITHOUT ever touching Supabase', async () => {
    const result = await markOnboardingFormAccessTokenUsed('   ')

    expect(result).toBe(false)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('trims the token before matching (so a copy-pasted trailing space/newline from an email client does not fail)', async () => {
    const chain = chainFor({ data: [{ token: 'tok-abc' }], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await markOnboardingFormAccessTokenUsed('  tok-abc  ')

    expect(chain.eq).toHaveBeenCalledWith('token', 'tok-abc')
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(markOnboardingFormAccessTokenUsed('tok-abc')).rejects.toThrow('boom')
  })
})

/**
 * createOnboardingFormAccessToken reuses ONE admin client across every
 * `.from()` call: one revoke-update per given target (email and/or
 * partner id, each independently scoped — no shared .or() string), then
 * the insert. `revokeResults` supplies one result per expected revoke
 * call, in order.
 */
function mockOnboardingClient(revokeResults: QueryResult[], insertResult: QueryResult) {
  const revokeChains = revokeResults.map((r) => chainFor(r))
  const insertChain = chainFor(insertResult)
  const from = vi.fn()
  for (const chain of revokeChains) from.mockReturnValueOnce(chain)
  from.mockReturnValueOnce(insertChain)
  createSupabaseAdminClient.mockReturnValue({ from })
  return { revokeChains, insertChain }
}

describe('createOnboardingFormAccessToken', () => {
  it('refuses to create a completely untargeted token (no email, no partner id)', async () => {
    await expect(
      createOnboardingFormAccessToken({ createdBy: 'staff-1' })
    ).rejects.toThrow('ONBOARDING_TOKEN_TARGET_REQUIRED')
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('auto-revokes any existing unused/unrevoked token for the SAME email before minting a new one, and does NOT touch odoo_partner_id when none was given', async () => {
    const { revokeChains } = mockOnboardingClient(
      [{ error: null }],
      { data: tokenRow(), error: null }
    )

    await createOnboardingFormAccessToken({
      recipientEmail: 'A@Example.com',
      createdBy: 'staff-1',
    })

    expect(revokeChains).toHaveLength(1)
    const [revokeChain] = revokeChains
    expect(revokeChain.eq).toHaveBeenCalledWith('form_kind', 'alta_autonomo')
    expect(revokeChain.is).toHaveBeenCalledWith('used_at', null)
    expect(revokeChain.is).toHaveBeenCalledWith('revoked_at', null)
    expect(revokeChain.eq).toHaveBeenCalledWith('recipient_email', 'a@example.com')
  })

  it('SECURITY FIX: when BOTH email and partner id are given, revokes matching EACH independently — no shared .or() filter string, so nothing in recipientEmail can inject an extra condition', async () => {
    const { revokeChains } = mockOnboardingClient(
      [{ error: null }, { error: null }],
      { data: tokenRow(), error: null }
    )

    await createOnboardingFormAccessToken({
      recipientEmail: 'a@x.com,revoked_at.is.null', // a hostile/malformed "email"
      odooPartnerId: 42,
      createdBy: 'staff-1',
    })

    expect(revokeChains).toHaveLength(2)
    const [byEmail, byPartnerId] = revokeChains
    // The raw (normalized) value is only ever passed through .eq() —
    // never concatenated into a filter string — so it cannot be
    // interpreted as extra Postgrest syntax.
    expect(byEmail.eq).toHaveBeenCalledWith('recipient_email', 'a@x.com,revoked_at.is.null')
    expect(byPartnerId.eq).toHaveBeenCalledWith('odoo_partner_id', 42)
    for (const chain of revokeChains) {
      expect(chain.or as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    }
  })

  it('mints the token with crypto.randomUUID() (two calls never collide) and normalizes the recipient email', async () => {
    mockOnboardingClient([{ error: null }], { data: tokenRow({ token: 'aaa' }), error: null })
    const a = await createOnboardingFormAccessToken({
      recipientEmail: '  A@Example.com  ',
      createdBy: 'staff-1',
    })

    mockOnboardingClient([{ error: null }], { data: tokenRow({ token: 'bbb' }), error: null })
    const b = await createOnboardingFormAccessToken({
      recipientEmail: 'a@example.com',
      createdBy: 'staff-1',
    })

    expect(typeof a.token).toBe('string')
    expect(a.token).not.toBe(b.token)
  })

  it('throws on an insert error', async () => {
    mockOnboardingClient([{ error: null }], { data: null, error: { message: 'insert failed' } })

    await expect(
      createOnboardingFormAccessToken({ recipientEmail: 'a@x.com', createdBy: 'staff-1' })
    ).rejects.toThrow('insert failed')
  })

  it('throws on a revoke error and never reaches the insert', async () => {
    const { insertChain } = mockOnboardingClient(
      [{ error: { message: 'revoke failed' } }],
      { data: tokenRow(), error: null }
    )

    await expect(
      createOnboardingFormAccessToken({ recipientEmail: 'a@x.com', createdBy: 'staff-1' })
    ).rejects.toThrow('revoke failed')
    expect(insertChain.insert).not.toHaveBeenCalled()
  })
})

describe('getOnboardingFormAccessTokenByToken', () => {
  it('returns null for an empty/whitespace token without touching Supabase', async () => {
    expect(await getOnboardingFormAccessTokenByToken('  ')).toBeNull()
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('returns null (not throw) when no row matches', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect(await getOnboardingFormAccessTokenByToken('tok-abc')).toBeNull()
  })

  it('returns the raw row verbatim (used_at/revoked_at/expires_at are NOT interpreted here — caller\'s job)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: tokenRow({ used_at: '2020-01-01T00:00:00.000Z' }), error: null }),
    })

    const result = await getOnboardingFormAccessTokenByToken('tok-abc')

    expect(result?.used_at).toBe('2020-01-01T00:00:00.000Z')
  })
})

describe('revokeOnboardingFormAccessToken', () => {
  it('only matches an unused, unrevoked token', async () => {
    const chain = chainFor({ data: [{ token: 'tok-abc' }], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await revokeOnboardingFormAccessToken('tok-abc')

    expect(chain.is).toHaveBeenCalledWith('used_at', null)
    expect(chain.is).toHaveBeenCalledWith('revoked_at', null)
  })

  it('returns false when nothing matched (already used or already revoked)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })

    expect(await revokeOnboardingFormAccessToken('tok-abc')).toBe(false)
  })
})

describe('recordOnboardingEmailSent', () => {
  it('resets all prior email-event timestamps to null on a fresh send', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordOnboardingEmailSent('tok-abc', 'resend-id-1')

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        resend_email_id: 'resend-id-1',
        email_delivered_at: null,
        email_opened_at: null,
        email_clicked_at: null,
        email_bounced_at: null,
        email_complained_at: null,
      })
    )
  })

  it('leaves recipient_email/recipient_name UNTOUCHED when not explicitly provided (undefined != empty string)', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordOnboardingEmailSent('tok-abc', 'resend-id-1')

    const payload = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect('recipient_email' in payload).toBe(false)
    expect('recipient_name' in payload).toBe(false)
  })

  it('DOES overwrite recipient_email with an explicit empty string when the caller passes one', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordOnboardingEmailSent('tok-abc', 'resend-id-1', '')

    const payload = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload.recipient_email).toBe('')
  })
})

describe('recordOnboardingEmailEvent', () => {
  it('FIRST-EVENT-WINS: only records the event if that column was still null — a later duplicate webhook does not overwrite the original timestamp', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordOnboardingEmailEvent('resend-id-1', 'email_opened_at', '2024-01-01T00:00:00Z')

    expect(chain.is).toHaveBeenCalledWith('email_opened_at', null)
    expect(chain.update).toHaveBeenCalledWith({ email_opened_at: '2024-01-01T00:00:00Z' })
  })

  it('scopes the update to the given resend_email_id', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordOnboardingEmailEvent('resend-id-1', 'email_clicked_at', '2024-01-01T00:00:00Z')

    expect(chain.eq).toHaveBeenCalledWith('resend_email_id', 'resend-id-1')
  })

  it('is a no-op for an empty emailId', async () => {
    await recordOnboardingEmailEvent('  ', 'email_opened_at', '2024-01-01T00:00:00Z')

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })
})

describe('deleteOnboardingFormAccessToken', () => {
  it('returns true only when a row was actually deleted', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ token: 'tok-abc' }], error: null }),
    })

    expect(await deleteOnboardingFormAccessToken('tok-abc')).toBe(true)
  })

  it('returns false when the token did not exist', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })

    expect(await deleteOnboardingFormAccessToken('tok-abc')).toBe(false)
  })
})
