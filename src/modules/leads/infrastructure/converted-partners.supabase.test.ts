import { describe, expect, it, vi, beforeEach } from 'vitest'

import { listConvertedOdooPartnerIds } from '@/src/modules/leads/infrastructure/converted-partners.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listConvertedOdooPartnerIds', () => {
  it('excluye odoo_partner_id en la query y devuelve un Set con los valores', async () => {
    const not = vi.fn().mockResolvedValue({
      data: [{ odoo_partner_id: 1 }, { odoo_partner_id: 2 }],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ not })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    })

    const result = await listConvertedOdooPartnerIds()

    expect(not).toHaveBeenCalledWith('odoo_partner_id', 'is', null)
    expect(result).toEqual(new Set([1, 2]))
  })

  it('filtra defensivamente cualquier null que se cuele en los datos', async () => {
    const not = vi.fn().mockResolvedValue({
      data: [{ odoo_partner_id: 1 }, { odoo_partner_id: null }],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ not }) }),
    })

    const result = await listConvertedOdooPartnerIds()

    expect(result).toEqual(new Set([1]))
  })

  it('lanza un Error con el mensaje de Supabase si la query falla', async () => {
    const not = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ not }) }),
    })

    await expect(listConvertedOdooPartnerIds()).rejects.toThrow('boom')
  })
})
