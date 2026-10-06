import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead, isOdooApiConfigured } = vi.hoisted(() => ({
  odooSearchRead: vi.fn(),
  isOdooApiConfigured: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return {
    ...actual,
    odooSearchRead,
    isOdooApiConfigured,
  }
})

import { listUpcomingObligacionReminders } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'

const currentYear = new Date().getFullYear()

function inDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  delete process.env.ODOO_OBLIGACIONES_PARENT_PREFIX
})

afterEach(() => {
  vi.useRealTimers()
})

describe('listUpcomingObligacionReminders', () => {
  it('returns [] without calling Odoo when it is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([])
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('builds a reminder for an open leaf task whose deduced deadline falls within the window', async () => {
    // Fija "hoy" para que Trimestre 1 (plazo 20 abril) caiga dentro de los
    // próximos 5 días sin importar cuándo se ejecute este test.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(currentYear, 3, 16))

    odooSearchRead
      .mockResolvedValueOnce([{ id: 1, name: `Obligaciones Fiscales [${currentYear}]`, project_id: [10, 'Proyecto Cliente'] }])
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 1', parent_id: [1, 'root'] }])
      .mockResolvedValueOnce([{ id: 3, name: 'Modelo 303 - IVA', parent_id: [2, 'periodo'], state: '01_in_progress' }])
      .mockResolvedValueOnce([{ id: 10, partner_id: [99, 'Cliente SL'] }])

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([
      {
        taskId: 3,
        partnerId: 99,
        modelLabel: 'Modelo 303',
        deadline: new Date(currentYear, 3, 20, 23, 59, 59),
      },
    ])
  })

  it('skips closed (done/cancelled) leaf tasks', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(currentYear, 3, 16))

    odooSearchRead
      .mockResolvedValueOnce([{ id: 1, name: `Obligaciones Fiscales [${currentYear}]`, project_id: [10, 'Proyecto'] }])
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 1', parent_id: [1, 'root'] }])
      .mockResolvedValueOnce([{ id: 3, name: 'Modelo 303 - IVA', parent_id: [2, 'periodo'], state: 'done' }])
      .mockResolvedValueOnce([{ id: 10, partner_id: [99, 'Cliente'] }])

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([])
  })

  it('skips leaf tasks whose deduced deadline is outside maxDaysAhead', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(currentYear, 0, 1)) // muy lejos del plazo de Trimestre 1 (20 abril)

    odooSearchRead
      .mockResolvedValueOnce([{ id: 1, name: `Obligaciones Fiscales [${currentYear}]`, project_id: [10, 'Proyecto'] }])
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 1', parent_id: [1, 'root'] }])
      .mockResolvedValueOnce([{ id: 3, name: 'Modelo 303 - IVA', parent_id: [2, 'periodo'], state: '01_in_progress' }])
      .mockResolvedValueOnce([{ id: 10, partner_id: [99, 'Cliente'] }])

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([])
  })

  it('skips leaf tasks with no deducible deadline (e.g. Mensuales) without crashing', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1, name: `Obligaciones Fiscales [${currentYear}]`, project_id: [10, 'Proyecto'] }])
      .mockResolvedValueOnce([{ id: 2, name: 'Mensuales', parent_id: [1, 'root'] }])
      .mockResolvedValueOnce([{ id: 3, name: 'Modelo 111 - Retenciones', parent_id: [2, 'periodo'], state: '01_in_progress' }])
      .mockResolvedValueOnce([{ id: 10, partner_id: [99, 'Cliente'] }])

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([])
  })

  it('ignores root tasks outside the current/previous fiscal year', async () => {
    odooSearchRead.mockResolvedValueOnce([
      { id: 1, name: `Obligaciones Fiscales [${currentYear - 5}]`, project_id: [10, 'Proyecto'] },
    ])

    const result = await listUpcomingObligacionReminders(5)

    expect(result).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })
})
