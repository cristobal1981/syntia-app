import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getOdooCompanyCatalog } from '@/src/modules/automatizaciones/infrastructure/odoo-company-catalog'

const { odooSearchRead } = vi.hoisted(() => ({ odooSearchRead: vi.fn() }))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ odooSearchRead }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getOdooCompanyCatalog', () => {
  it('pide el correo además del nombre y usa el correo cuando el contacto no tiene nombre', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 1, name: 'Acme SL', email: 'info@acme.es' },
      { id: 2, name: false, email: 'sin.nombre@example.com' },
      { id: 3, name: false, email: false },
    ])

    const result = await getOdooCompanyCatalog()

    expect(odooSearchRead).toHaveBeenCalledWith(
      'res.partner',
      expect.objectContaining({ fields: ['name', 'email'], domain: [['parent_id', '=', false]] })
    )
    expect(result).toEqual([
      { id: 1, name: 'Acme SL' },
      { id: 2, name: 'sin.nombre@example.com' },
      { id: 3, name: 'Sin nombre' },
    ])
  })

  it('descarta filas con id no válido sin romper el resto', async () => {
    odooSearchRead.mockResolvedValue([{ id: 0, name: 'X' }, { id: 5, name: 'Y' }])

    expect(await getOdooCompanyCatalog()).toEqual([{ id: 5, name: 'Y' }])
  })
})
