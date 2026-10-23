import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead } = vi.hoisted(() => ({ odooSearchRead: vi.fn() }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/modules/portal/infrastructure/odoo-json-client')>()),
  odooSearchRead,
}))

import { resolveOdooUsersByIds } from '@/src/modules/portal/infrastructure/odoo-advisor-partner'

// La caché es de módulo: cada prueba usa ids propios.
beforeEach(() => vi.resetAllMocks())

describe('resolveOdooUsersByIds', () => {
  it('pide partner y nombre en una sola consulta y limpia el nombre', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 101, name: '  Ana García ', partner_id: [501, 'Ana García'] },
      { id: 102, name: 'Luis Pérez', partner_id: false },
    ])

    const users = await resolveOdooUsersByIds([101, 102, 101])

    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(odooSearchRead).toHaveBeenCalledWith('res.users', {
      domain: [['id', 'in', [101, 102]]],
      fields: ['partner_id', 'name'],
      limit: 2,
    })
    expect(users.get(101)).toEqual({ partnerId: 501, name: 'Ana García' })
    expect(users.get(102)).toEqual({ partnerId: null, name: 'Luis Pérez' })
  })

  it('recuerda los usuarios: la segunda vez no vuelve a Odoo, y solo pide los que faltan', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 201, name: 'Marta', partner_id: [601, 'Marta'] }])
    await resolveOdooUsersByIds([201])

    odooSearchRead.mockResolvedValueOnce([{ id: 202, name: 'Pablo', partner_id: [602, 'Pablo'] }])
    const users = await resolveOdooUsersByIds([201, 202])

    expect(odooSearchRead).toHaveBeenCalledTimes(2)
    expect(odooSearchRead).toHaveBeenLastCalledWith('res.users', expect.objectContaining({
      domain: [['id', 'in', [202]]],
    }))
    expect([...users.keys()].sort()).toEqual([201, 202])
  })

  it('ignora ids no válidos sin consultar, y un usuario que Odoo no devuelve no aparece', async () => {
    expect((await resolveOdooUsersByIds([0, -3, 1.5])).size).toBe(0)
    expect(odooSearchRead).not.toHaveBeenCalled()

    odooSearchRead.mockResolvedValue([])
    expect((await resolveOdooUsersByIds([301])).size).toBe(0)
  })

  it('un nombre que no es texto queda vacío', async () => {
    odooSearchRead.mockResolvedValue([{ id: 401, name: false, partner_id: [701, 'x'] }])
    expect((await resolveOdooUsersByIds([401])).get(401)).toEqual({ partnerId: 701, name: '' })
  })
})
