import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  deleteClientIntegration,
  fetchClientIntegrationMap,
  getClientIntegrationByUserId,
  upsertClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'

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
  chain.select = () => chain
  chain.in = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = () => resolved
  chain.upsert = vi.fn(() => resolved)
  chain.delete = vi.fn(() => chain)
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchClientIntegrationMap', () => {
  it('applies an .in() filter when specific ids are given', async () => {
    const chain = chainFor({
      data: [{ user_id: 'u1', odoo_partner_id: 1, odoo_user_id: null, drive_folder_id: null }],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchClientIntegrationMap(['u1', 'u2'])

    expect(chain.in).toHaveBeenCalledWith('user_id', ['u1', 'u2'])
    expect(map.get('u1')?.odoo_partner_id).toBe(1)
  })

  it('DESIGN CONTRACT: no ids (undefined or empty array) means NO FILTER — returns every row, not zero', async () => {
    const chain = chainFor({
      data: [
        { user_id: 'u1', odoo_partner_id: 1, odoo_user_id: null, drive_folder_id: null },
        { user_id: 'u2', odoo_partner_id: 2, odoo_user_id: null, drive_folder_id: null },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchClientIntegrationMap([])

    expect(chain.in).not.toHaveBeenCalled()
    expect(map.size).toBe(2)
  })

  it('throws on a DB error rather than returning a silently-empty map', async () => {
    const chain = chainFor({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(fetchClientIntegrationMap()).rejects.toThrow('boom')
  })
})

describe('upsertClientIntegration', () => {
  it('upserts keyed on user_id (onConflict), stamping updated_at', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertClientIntegration('u1', { odoo_partner_id: 42, drive_folder_id: 'folder-1' })

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        odoo_partner_id: 42,
        drive_folder_id: 'folder-1',
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    )
  })

  it('throws on a DB error', async () => {
    const chain = chainFor({ error: { message: 'conflict' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(
      upsertClientIntegration('u1', { odoo_partner_id: null, drive_folder_id: null })
    ).rejects.toThrow('conflict')
  })
})

describe('deleteClientIntegration', () => {
  it('deletes scoped to the given user_id', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await deleteClientIntegration('u1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})

describe('getClientIntegrationByUserId', () => {
  it('returns null (not an error/throw) when no row exists for that user', async () => {
    const chain = chainFor({ data: null, error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const result = await getClientIntegrationByUserId('nonexistent')

    expect(result).toBeNull()
  })

  it('scopes the lookup to the given user_id', async () => {
    const chain = chainFor({
      data: { user_id: 'u1', odoo_partner_id: 5, odoo_user_id: null, drive_folder_id: null },
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const result = await getClientIntegrationByUserId('u1')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(result?.odoo_partner_id).toBe(5)
  })
})
