import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead } = vi.hoisted(() => ({ odooSearchRead: vi.fn() }))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ odooSearchRead }))

type CountryFn = typeof import('@/src/modules/onboarding/resolve-odoo-country-id').resolveOdooCountryId
type StateFn = typeof import('@/src/modules/onboarding/resolve-odoo-state-id').resolveOdooStateId

let resolveOdooCountryId: CountryFn
let resolveOdooStateId: StateFn

beforeEach(async () => {
  vi.resetAllMocks()
  // las cachés son de módulo: módulo fresco por test
  vi.resetModules()
  resolveOdooCountryId = (await import('@/src/modules/onboarding/resolve-odoo-country-id'))
    .resolveOdooCountryId
  resolveOdooStateId = (await import('@/src/modules/onboarding/resolve-odoo-state-id'))
    .resolveOdooStateId
})

describe('resolveOdooCountryId', () => {
  it('id numérico: lo devuelve sin consultar Odoo', async () => {
    expect(await resolveOdooCountryId(' 68 ')).toBe(68)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('BUG documentado: parseInt permisivo, "68abc" y "1 Spain" se leen como id', async () => {
    expect(await resolveOdooCountryId('68abc')).toBe(68)
    expect(await resolveOdooCountryId('1 Spain')).toBe(1)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('cero o negativo no son id: va a Odoo', async () => {
    odooSearchRead.mockResolvedValue([{ id: 9 }])
    await resolveOdooCountryId('0')
    expect(odooSearchRead).toHaveBeenCalled()
    await expect(resolveOdooCountryId('-5')).resolves.toBe(9)
  })

  it('código ISO de 2 letras: busca por code en mayúsculas', async () => {
    odooSearchRead.mockResolvedValue([{ id: 68 }])
    expect(await resolveOdooCountryId('es')).toBe(68)
    expect(odooSearchRead).toHaveBeenCalledWith('res.country', {
      domain: [['code', '=', 'ES']],
      fields: ['id', 'code', 'name'],
      limit: 1,
    })
  })

  it('alias con tildes/mayúsculas: España -> ES', async () => {
    odooSearchRead.mockResolvedValue([{ id: 68 }])
    expect(await resolveOdooCountryId('  España ')).toBe(68)
    expect(odooSearchRead.mock.calls[0][1].domain).toEqual([['code', '=', 'ES']])
  })

  it('cachea: segunda llamada no consulta', async () => {
    odooSearchRead.mockResolvedValue([{ id: 68 }])
    await resolveOdooCountryId('Spain')
    await resolveOdooCountryId('spain')
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('código no encontrado: cae a búsqueda por nombre ilike', async () => {
    odooSearchRead.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 77 }])
    expect(await resolveOdooCountryId('Portugal')).toBe(77)
    expect(odooSearchRead).toHaveBeenNthCalledWith(2, 'res.country', {
      domain: [['name', 'ilike', 'Portugal']],
      fields: ['id', 'code', 'name'],
      limit: 1,
    })
  })

  it('nombre sin alias: solo búsqueda por nombre', async () => {
    odooSearchRead.mockResolvedValue([{ id: 5 }])
    expect(await resolveOdooCountryId('Narnia')).toBe(5)
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(odooSearchRead.mock.calls[0][1].domain).toEqual([['name', 'ilike', 'Narnia']])
  })

  it('no encontrado: lanza ODOO_COUNTRY_NOT_FOUND', async () => {
    odooSearchRead.mockResolvedValue([])
    await expect(resolveOdooCountryId('Narnia')).rejects.toThrow('ODOO_COUNTRY_NOT_FOUND')
  })

  it('id 0 de Odoo no cuenta como encontrado', async () => {
    odooSearchRead.mockResolvedValue([{ id: 0 }])
    await expect(resolveOdooCountryId('Narnia')).rejects.toThrow('ODOO_COUNTRY_NOT_FOUND')
  })
})

describe('resolveOdooStateId', () => {
  it('id numérico: sin consulta', async () => {
    expect(await resolveOdooStateId(' 12 ', 68)).toBe(12)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('cero o negativo no son id de provincia: va a Odoo por nombre', async () => {
    odooSearchRead.mockResolvedValue([{ id: 7 }])

    await expect(resolveOdooStateId('-5', 68)).resolves.toBe(7)
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    await expect(resolveOdooStateId('0', 68)).resolves.toBe(7)
    expect(odooSearchRead).toHaveBeenCalledTimes(2)
  })

  it('BUG documentado: parseInt permisivo, "28001 Madrid" se lee como 28001', async () => {
    expect(await resolveOdooStateId('28001 Madrid', 68)).toBe(28001)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('nombre: filtra por país y name ilike', async () => {
    odooSearchRead.mockResolvedValue([{ id: 3 }])
    expect(await resolveOdooStateId(' Madrid ', 68)).toBe(3)
    expect(odooSearchRead).toHaveBeenCalledWith('res.country.state', {
      domain: [
        ['country_id', '=', 68],
        ['name', 'ilike', 'Madrid'],
      ],
      fields: ['id', 'name'],
      limit: 1,
    })
  })

  it('cachea por país+nombre', async () => {
    odooSearchRead.mockResolvedValue([{ id: 3 }])
    await resolveOdooStateId('Madrid', 68)
    await resolveOdooStateId('MADRID', 68)
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    await resolveOdooStateId('Madrid', 69)
    expect(odooSearchRead).toHaveBeenCalledTimes(2)
  })

  it('no encontrado: lanza ODOO_STATE_NOT_FOUND', async () => {
    odooSearchRead.mockResolvedValue([])
    await expect(resolveOdooStateId('Atlantis', 68)).rejects.toThrow('ODOO_STATE_NOT_FOUND')
  })
})
