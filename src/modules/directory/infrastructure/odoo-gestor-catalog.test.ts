import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  getOdooGestorCatalog,
  listLinkedOdooUserIds,
} from '@/src/modules/directory/infrastructure/odoo-gestor-catalog'

const { createSupabaseAdminClient, odooSearchRead, unstable_cache } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  odooSearchRead: vi.fn(),
  // Bypass Next's actual caching machinery (not available outside a real
  // request) — just call the wrapped loader through immediately.
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ odooSearchRead }))
vi.mock('next/cache', () => ({ unstable_cache }))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.in = () => chain
  chain.not = () => chain
  chain.then = (resolve: (v: typeof result) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  unstable_cache.mockImplementation((fn: (...args: unknown[]) => unknown) => fn)
})

describe('listLinkedOdooUserIds', () => {
  it('only counts advisor/admin rows with a positive odoo_user_id', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [{ odoo_user_id: 10 }, { odoo_user_id: 0 }, { odoo_user_id: null }],
          error: null,
        }),
    })

    const result = await listLinkedOdooUserIds()

    expect(result).toEqual([10])
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(listLinkedOdooUserIds()).rejects.toThrow('boom')
  })
})

describe('getOdooGestorCatalog (full pipeline: exclude already-linked Odoo users)', () => {
  it('excludes already-linked ids from the Odoo domain filter when some exist', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ odoo_user_id: 10 }, { odoo_user_id: 20 }], error: null }),
    })
    odooSearchRead.mockResolvedValue([])

    await getOdooGestorCatalog()

    expect(odooSearchRead).toHaveBeenCalledWith(
      'res.users',
      expect.objectContaining({
        domain: expect.arrayContaining([['id', 'not in', [10, 20]]]),
      })
    )
  })

  it('does NOT add an empty exclusion clause when there are no linked ids yet', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })
    odooSearchRead.mockResolvedValue([])

    await getOdooGestorCatalog()

    const domain = odooSearchRead.mock.calls[0][1].domain
    expect(domain).not.toContainEqual(['id', 'not in', []])
  })

  it('maps returned Odoo rows into import options', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })
    odooSearchRead.mockResolvedValue([
      { id: 7, name: 'Ana', login: 'ana@example.com', email: false, phone: false },
    ])

    const result = await getOdooGestorCatalog()

    expect(result).toEqual([
      { id: 7, label: 'Ana', email: 'ana@example.com', phone: undefined, odooUserId: '7' },
    ])
  })
})
