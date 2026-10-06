import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveClientEmailsByPartnerIds } from '@/src/modules/obligaciones/infrastructure/resolve-client-emails-by-partner-ids.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.in = () => chain
  chain.then = (resolve: (v: typeof result) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

function mockSupabase(integrations: unknown[], users: unknown[]) {
  const integrationsChain = chainFor({ data: integrations, error: null })
  const usersChain = chainFor({ data: users, error: null })
  createSupabaseAdminClient.mockReturnValue({
    from: (table: string) => (table === 'client_integrations' ? integrationsChain : usersChain),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveClientEmailsByPartnerIds', () => {
  it('returns an empty map without querying Supabase when given no partner ids', async () => {
    const result = await resolveClientEmailsByPartnerIds([])

    expect(result).toEqual(new Map())
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('maps partner_id to the owner email alone when there is no collaborator', async () => {
    mockSupabase(
      [{ user_id: 'owner-1', odoo_partner_id: 99 }],
      [{ id: 'owner-1', email: 'cliente@example.com', is_active: true, role: 'client' }]
    )

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result).toEqual(new Map([[99, ['cliente@example.com']]]))
  })

  it('includes an eligible collaborator alongside the owner, not instead of it', async () => {
    mockSupabase(
      [
        { user_id: 'owner-1', odoo_partner_id: 99 },
        { user_id: 'worker-1', odoo_partner_id: 99 },
      ],
      [
        { id: 'owner-1', email: 'cliente@example.com', is_active: true, role: 'client' },
        { id: 'worker-1', email: 'colaborador@example.com', is_active: true, role: 'worker' },
      ]
    )

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result.get(99)).toEqual(
      expect.arrayContaining(['cliente@example.com', 'colaborador@example.com'])
    )
    expect(result.get(99)).toHaveLength(2)
  })

  it('excludes the collaborator too when the owner is inactive, even if the collaborator itself is active', async () => {
    mockSupabase(
      [
        { user_id: 'owner-1', odoo_partner_id: 99 },
        { user_id: 'worker-1', odoo_partner_id: 99 },
      ],
      [
        { id: 'owner-1', email: 'cliente@example.com', is_active: false, role: 'client' },
        { id: 'worker-1', email: 'colaborador@example.com', is_active: true, role: 'worker' },
      ]
    )

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result).toEqual(new Map())
  })

  it('excludes the collaborator too when there is no owner row at all for that partner_id', async () => {
    mockSupabase(
      [{ user_id: 'worker-1', odoo_partner_id: 99 }],
      [{ id: 'worker-1', email: 'colaborador@example.com', is_active: true, role: 'worker' }]
    )

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result).toEqual(new Map())
  })

  it('excludes the owner when inactive', async () => {
    mockSupabase(
      [{ user_id: 'owner-1', odoo_partner_id: 99 }],
      [{ id: 'owner-1', email: 'cliente@example.com', is_active: false, role: 'client' }]
    )

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result).toEqual(new Map())
  })

  it('returns an empty map and skips the users query when no integration row matches', async () => {
    const integrationsChain = chainFor({ data: [], error: null })
    const fromSpy = vi.fn().mockReturnValue(integrationsChain)
    createSupabaseAdminClient.mockReturnValue({ from: fromSpy })

    const result = await resolveClientEmailsByPartnerIds([99])

    expect(result).toEqual(new Map())
    expect(fromSpy).toHaveBeenCalledTimes(1)
  })

  it('throws when the client_integrations query errors', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(resolveClientEmailsByPartnerIds([99])).rejects.toThrow('boom')
  })
})
