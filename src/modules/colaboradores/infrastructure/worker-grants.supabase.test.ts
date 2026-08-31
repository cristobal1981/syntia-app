import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  deleteWorkerGrant,
  getWorkerGrant,
  listWorkerGrantsForOwner,
  parseAllowedSections,
  propagateOwnerIntegrationToWorkers,
  sanitizeAllowedSections,
  upsertWorkerGrant,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'

const { createSupabaseAdminClient, upsertClientIntegration } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  upsertClientIntegration: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/directory/infrastructure/client-integrations.supabase', () => ({
  upsertClientIntegration,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
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

describe('sanitizeAllowedSections (write-time whitelist)', () => {
  it('keeps only known section hrefs with known levels, dropping anything injected/unknown', () => {
    expect(
      sanitizeAllowedSections({
        '/tramites': 'write',
        '/admin': 'write',
        __proto__: 'write',
        '/documentos': 'read',
      } as never)
    ).toEqual({ '/tramites': 'write', '/documentos': 'read' })
  })

  it('drops entries with a level that is not "read" or "write"', () => {
    expect(sanitizeAllowedSections({ '/tramites': 'admin' } as never)).toEqual({})
  })

  it('downgrades "write" to "read" for sections with no mutation of their own (/firmas, /guias)', () => {
    expect(
      sanitizeAllowedSections({ '/firmas': 'write', '/guias': 'write' })
    ).toEqual({ '/firmas': 'read', '/guias': 'read' })
  })

  it('empty input yields empty output (no default "grant everything")', () => {
    expect(sanitizeAllowedSections({})).toEqual({})
  })
})

describe('parseAllowedSections (read-time parsing, e.g. from a JSON column)', () => {
  it('accepts the legacy array shape, mapping each known href to "write" (preserves the old all-or-nothing access)', () => {
    expect(
      parseAllowedSections(['/tramites', 42, null, '/not-a-section', '/firmas'])
    ).toEqual({ '/tramites': 'write', '/firmas': 'read' })
  })

  it('accepts the current object shape and sanitizes it the same way as sanitizeAllowedSections', () => {
    expect(parseAllowedSections({ '/tramites': 'read', '/admin': 'write' })).toEqual({
      '/tramites': 'read',
    })
  })

  it('returns {} for anything that is neither an array nor an object (defensive against a malformed DB value)', () => {
    expect(parseAllowedSections(null)).toEqual({})
    expect(parseAllowedSections('/tramites')).toEqual({})
    expect(parseAllowedSections(undefined)).toEqual({})
  })
})

describe('getWorkerGrant', () => {
  it('returns null when no grant row exists (not an error)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect(await getWorkerGrant('w1')).toBeNull()
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(getWorkerGrant('w1')).rejects.toThrow('boom')
  })
})

describe('listWorkerGrantsForOwner (tenant scoping)', () => {
  it('scopes the query to the given owner_user_id — not every grant in the table', async () => {
    const chain = chainFor({ data: [{ worker_user_id: 'w1' }], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await listWorkerGrantsForOwner('owner-1')

    expect(chain.eq).toHaveBeenCalledWith('owner_user_id', 'owner-1')
  })

  it('returns [] rather than throwing when there are no rows', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect(await listWorkerGrantsForOwner('owner-1')).toEqual([])
  })
})

describe('upsertWorkerGrant', () => {
  it('upserts keyed on worker_user_id, stamping updated_at', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertWorkerGrant({
      workerUserId: 'w1',
      ownerUserId: 'owner-1',
      allowedSections: { '/tramites': 'write' },
      isEnabled: true,
    })

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        worker_user_id: 'w1',
        owner_user_id: 'owner-1',
        allowed_sections: { '/tramites': 'write' },
        is_enabled: true,
        updated_at: expect.any(String),
      }),
      { onConflict: 'worker_user_id' }
    )
  })
})

describe('deleteWorkerGrant', () => {
  it('deletes scoped to worker_user_id, not the whole table', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await deleteWorkerGrant('w1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('worker_user_id', 'w1')
  })
})

describe('propagateOwnerIntegrationToWorkers (keeps colaboradores in sync with the titular)', () => {
  it('re-upserts the SAME integration fields for every one of that owner\'s workers', async () => {
    const chain = chainFor({
      data: [
        { worker_user_id: 'w1', owner_user_id: 'owner-1', allowed_sections: [], is_enabled: true },
        { worker_user_id: 'w2', owner_user_id: 'owner-1', allowed_sections: [], is_enabled: true },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await propagateOwnerIntegrationToWorkers('owner-1', {
      odoo_partner_id: 999,
      drive_folder_id: 'folder-x',
    })

    expect(upsertClientIntegration).toHaveBeenCalledWith('w1', {
      odoo_partner_id: 999,
      drive_folder_id: 'folder-x',
    })
    expect(upsertClientIntegration).toHaveBeenCalledWith('w2', {
      odoo_partner_id: 999,
      drive_folder_id: 'folder-x',
    })
    expect(upsertClientIntegration).toHaveBeenCalledTimes(2)
  })

  it('is a no-op when the owner has no workers', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })

    await propagateOwnerIntegrationToWorkers('owner-1', {
      odoo_partner_id: 1,
      drive_folder_id: null,
    })

    expect(upsertClientIntegration).not.toHaveBeenCalled()
  })
})
