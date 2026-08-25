import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  getOdooPartnerCatalog,
  listLinkedOdooPartnerIds,
} from '@/src/modules/directory/infrastructure/odoo-partner-catalog'

const { createSupabaseAdminClient, odooSearchRead, unstable_cache, resolvePublicDriveFolderMap } =
  vi.hoisted(() => ({
    createSupabaseAdminClient: vi.fn(),
    odooSearchRead: vi.fn(),
    unstable_cache: vi.fn(
      (fn: (...args: unknown[]) => unknown, _key: string[], _opts: unknown) => fn
    ),
    resolvePublicDriveFolderMap: vi.fn(),
  }))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ odooSearchRead }))
vi.mock('next/cache', () => ({ unstable_cache }))
vi.mock('@/src/modules/portal/infrastructure/google-drive-public-folder', () => ({
  resolvePublicDriveFolderMap,
}))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.not = () => chain
  chain.then = (resolve: (v: typeof result) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  unstable_cache.mockImplementation(
    (fn: (...args: unknown[]) => unknown, _key: string[], _opts: unknown) => fn
  )
  resolvePublicDriveFolderMap.mockResolvedValue(new Map())
  delete process.env.ODOO_PARTNER_DRIVE_FIELD
  delete process.env.ODOO_PARTNER_CONTACT_EMAIL_FIELD
})

describe('listLinkedOdooPartnerIds', () => {
  it('only counts positive odoo_partner_id values', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [{ odoo_partner_id: 5 }, { odoo_partner_id: 0 }, { odoo_partner_id: null }],
          error: null,
        }),
    })

    expect(await listLinkedOdooPartnerIds()).toEqual([5])
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(listLinkedOdooPartnerIds()).rejects.toThrow('boom')
  })
})

describe('getOdooPartnerCatalog (full pipeline)', () => {
  it('excludes already-linked partner ids by default', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ odoo_partner_id: 5 }], error: null }),
    })
    odooSearchRead.mockResolvedValue([])

    await getOdooPartnerCatalog()

    expect(odooSearchRead).toHaveBeenCalledWith(
      'res.partner',
      expect.objectContaining({ domain: expect.arrayContaining([['id', 'not in', [5]]]) })
    )
  })

  it('DOES NOT exclude linked partners when includeLinked is true — and never even queries Supabase for linked ids', async () => {
    odooSearchRead.mockResolvedValue([])

    await getOdooPartnerCatalog({ includeLinked: true })

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
    const domain = odooSearchRead.mock.calls[0][1].domain
    expect(domain).toEqual([])
  })

  it('resolves a Drive folder link from the configured Drive field into a public folder id', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })
    odooSearchRead.mockResolvedValue([
      {
        id: 1,
        name: 'Acme',
        email: false,
        phone: false,
        is_company: true,
        x_studio_google_drive: 'https://drive.google.com/drive/folders/FOLDER123',
      },
    ])
    resolvePublicDriveFolderMap.mockResolvedValue(new Map([['FOLDER123', 'public-id-xyz']]))

    const result = await getOdooPartnerCatalog()

    expect(resolvePublicDriveFolderMap).toHaveBeenCalledWith(['FOLDER123'])
    expect(result[0].driveFolderId).toBe('public-id-xyz')
  })

  it('skips partners with no parseable Drive URL without crashing', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })
    odooSearchRead.mockResolvedValue([
      { id: 2, name: 'Bob', email: false, phone: false, is_company: false },
    ])

    const result = await getOdooPartnerCatalog()

    expect(resolvePublicDriveFolderMap).toHaveBeenCalledWith([])
    expect(result[0].driveFolderId).toBeUndefined()
  })

  it('caches separately by includeLinked (the cache key must differ, or a staff member toggling the filter would see stale results)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [], error: null }),
    })
    odooSearchRead.mockResolvedValue([])

    await getOdooPartnerCatalog({ includeLinked: false })
    await getOdooPartnerCatalog({ includeLinked: true })

    const [, keyFalse] = unstable_cache.mock.calls[0]
    const [, keyTrue] = unstable_cache.mock.calls[1]
    expect(keyFalse).not.toEqual(keyTrue)
  })
})
