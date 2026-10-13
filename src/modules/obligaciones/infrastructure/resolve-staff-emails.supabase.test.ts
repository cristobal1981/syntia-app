import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listStaffEmails } from '@/src/modules/obligaciones/infrastructure/resolve-staff-emails.supabase'

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
  chain.in = () => resolved
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listStaffEmails', () => {
  it('queries users filtered by admin/advisor role', async () => {
    const inSpy = vi.fn().mockResolvedValue({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ select: () => ({ in: inSpy }) }) })

    await listStaffEmails()

    expect(inSpy).toHaveBeenCalledWith('role', ['admin', 'advisor'])
  })

  it('returns deduplicated emails of active staff users', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [
            { email: 'admin@example.com', is_active: true },
            { email: 'gestor@example.com', is_active: true },
            { email: 'admin@example.com', is_active: true },
          ],
          error: null,
        }),
    })

    const result = await listStaffEmails()

    expect(result).toEqual(['admin@example.com', 'gestor@example.com'])
  })

  it('excludes inactive staff and staff without an email', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [
            { email: 'inactivo@example.com', is_active: false },
            { email: null, is_active: true },
            { email: 'activo@example.com', is_active: true },
          ],
          error: null,
        }),
    })

    const result = await listStaffEmails()

    expect(result).toEqual(['activo@example.com'])
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(listStaffEmails()).rejects.toThrow('boom')
  })
})
