import { describe, expect, it, vi, beforeEach } from 'vitest'

import { fetchAssignedAdvisorSourceForClient } from '@/src/modules/profile/infrastructure/assigned-advisor.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = () => resolved
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchAssignedAdvisorSourceForClient', () => {
  it('returns null WITHOUT querying the advisor tables when the client has no advisor_id', async () => {
    const from = vi.fn().mockReturnValueOnce(chainFor({ data: { advisor_id: null }, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await fetchAssignedAdvisorSourceForClient('client-1')

    expect(result).toBeNull()
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('returns null when the client profile row does not exist at all', async () => {
    const from = vi.fn().mockReturnValueOnce(chainFor({ data: null, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    expect(await fetchAssignedAdvisorSourceForClient('client-1')).toBeNull()
  })

  it('throws when the client profile lookup errors', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: null, error: { message: 'client lookup failed' } }))
    createSupabaseAdminClient.mockReturnValue({ from })

    await expect(fetchAssignedAdvisorSourceForClient('client-1')).rejects.toThrow(
      'client lookup failed'
    )
  })

  it('scopes the advisor user/profile lookups to the advisor_id, not the client id', async () => {
    const userChain = chainFor({ data: { email: 'advisor@x.com' }, error: null })
    const profileChain = chainFor({ data: null, error: null })
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(profileChain)
    createSupabaseAdminClient.mockReturnValue({ from })

    await fetchAssignedAdvisorSourceForClient('client-1')

    expect(userChain.eq).toHaveBeenCalledWith('id', 'advisor-9')
    expect(profileChain.eq).toHaveBeenCalledWith('user_id', 'advisor-9')
  })

  it('throws when the advisor user lookup errors', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: { message: 'user lookup failed' } }))
      .mockReturnValueOnce(chainFor({ data: null, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    await expect(fetchAssignedAdvisorSourceForClient('client-1')).rejects.toThrow(
      'user lookup failed'
    )
  })

  it('throws when the advisor profile lookup errors', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: { email: 'advisor@x.com' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: { message: 'profile lookup failed' } }))
    createSupabaseAdminClient.mockReturnValue({ from })

    await expect(fetchAssignedAdvisorSourceForClient('client-1')).rejects.toThrow(
      'profile lookup failed'
    )
  })

  it('returns null when the advisor user row does not exist (e.g. dangling advisor_id)', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    expect(await fetchAssignedAdvisorSourceForClient('client-1')).toBeNull()
  })

  it('returns null when the advisor has no email or a blank/whitespace-only email', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: { email: '   ' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    expect(await fetchAssignedAdvisorSourceForClient('client-1')).toBeNull()
  })

  it('falls back to the advisor email as the display name when there is no profile row', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: { email: 'advisor@x.com' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: null, error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await fetchAssignedAdvisorSourceForClient('client-1')

    expect(result).toEqual({ name: 'advisor@x.com', email: 'advisor@x.com' })
  })

  it('builds the display name from the profile row when one exists, and trims the email', async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(chainFor({ data: { advisor_id: 'advisor-9' }, error: null }))
      .mockReturnValueOnce(chainFor({ data: { email: '  advisor@x.com  ' }, error: null }))
      .mockReturnValueOnce(
        chainFor({
          data: { first_name: 'Ana', first_surname: 'García', second_surname: null },
          error: null,
        })
      )
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await fetchAssignedAdvisorSourceForClient('client-1')

    expect(result).toEqual({ name: 'Ana García', email: 'advisor@x.com' })
  })
})
