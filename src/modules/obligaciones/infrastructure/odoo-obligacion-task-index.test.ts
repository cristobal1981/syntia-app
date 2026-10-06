import { beforeEach, describe, expect, it, vi } from 'vitest'

const { odooSearchRead } = vi.hoisted(() => ({
  odooSearchRead: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return {
    ...actual,
    odooSearchRead,
  }
})

import { buildObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env.ODOO_OBLIGACIONES_PARENT_PREFIX
})

describe('buildObligacionTaskIndex', () => {
  it('returns empty when there are no projects', async () => {
    const result = await buildObligacionTaskIndex([])

    expect(result).toEqual({ excludedTaskIds: [], leaves: [] })
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('builds a client-friendly displayLabel ("Modelo · Periodo") without the client name, from the raw Odoo leaf name', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1 }]) // roots
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 2' }]) // periods
      .mockResolvedValueOnce([
        {
          id: 3,
          name: 'Modelo 111 - GUILLERMO PROBANDO PRUEBAS',
          parent_id: [2, 'Trimestre 2'],
          state: '01_in_progress',
        },
      ]) // leaves

    const result = await buildObligacionTaskIndex([10])

    expect(result.leaves).toEqual([
      expect.objectContaining({
        id: 3,
        name: 'Modelo 111 - GUILLERMO PROBANDO PRUEBAS',
        displayLabel: 'Modelo 111 · Trimestre 2',
      }),
    ])
  })

  it('falls back to the bare model label when the period container cannot be resolved', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 2' }])
      .mockResolvedValueOnce([
        { id: 3, name: 'Modelo 303 - Cliente SL', parent_id: false, state: '01_in_progress' },
      ])

    const result = await buildObligacionTaskIndex([10])

    expect(result.leaves[0].displayLabel).toBe('Modelo 303')
  })

  it('excludedTaskIds still includes roots, periods and leaves (unaffected by the displayLabel change)', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Trimestre 2' }])
      .mockResolvedValueOnce([
        { id: 3, name: 'Modelo 111 - Cliente', parent_id: [2, 'Trimestre 2'], state: '01_in_progress' },
      ])

    const result = await buildObligacionTaskIndex([10])

    expect(result.excludedTaskIds).toEqual([1, 2, 3])
  })
})
