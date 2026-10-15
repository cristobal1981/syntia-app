import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { listObligacionNoticeCandidates } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'

const YEAR = 2026

/** Reloj del cron en Canarias: el plazo de Trimestre 1 es el 20 de abril. */
const clockOn = (day: number, hour = 8) => ({ year: YEAR, month: 4, day, hour })

const root = { id: 1, name: `Obligaciones Fiscales [${YEAR}]`, project_id: [10, 'Proyecto Cliente'] }
const period = { id: 2, name: 'Trimestre 1', parent_id: [1, 'root'] }
const leaf = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  name: 'Modelo 303 - IVA',
  parent_id: [2, 'periodo'],
  state: '01_in_progress',
  ...overrides,
})
const project = { id: 10, partner_id: [99, 'Cliente SL'] }

function mockTree(
  leaves: Array<ReturnType<typeof leaf>>,
  attachments: Array<{ res_id: number }> | null = [],
  options: { periodName?: string; projectRow?: unknown } = {}
) {
  odooSearchRead
    .mockResolvedValueOnce([root])
    .mockResolvedValueOnce([{ ...period, name: options.periodName ?? period.name }])
    .mockResolvedValueOnce(leaves)
    .mockResolvedValueOnce([options.projectRow ?? project])
  // `null`: nada que avisar hoy, el repositorio no llega a pedir adjuntos.
  if (attachments) odooSearchRead.mockResolvedValueOnce(attachments)
}

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  delete process.env.ODOO_OBLIGACIONES_PARENT_PREFIX
})

describe('listObligacionNoticeCandidates', () => {
  it('returns [] without calling Odoo when it is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result).toEqual([])
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('returns the task with its kind and attachment count when today has a notice in this slot', async () => {
    mockTree([leaf()], [{ res_id: 3 }, { res_id: 3 }])

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result).toEqual([
      {
        taskId: 3,
        partnerId: 99,
        clientName: 'Cliente SL',
        modelLabel: 'Modelo 303',
        deadline: new Date(YEAR, 3, 20, 23, 59, 59),
        state: '01_in_progress',
        attachmentCount: 2,
        kind: 'normal',
      },
    ])
  })

  it('uses the domiciliar kind on days 10 and 14 for a domiciliable model', async () => {
    mockTree([leaf()])
    const day10 = await listObligacionNoticeCandidates({ clock: clockOn(10), slot: 'morning' })

    mockTree([leaf()])
    const day14 = await listObligacionNoticeCandidates({ clock: clockOn(14), slot: 'morning' })

    expect(day10.map((candidate) => candidate.kind)).toEqual(['domiciliar'])
    expect(day14.map((candidate) => candidate.kind)).toEqual(['domiciliar'])
  })

  it('a model that is not domiciliable still gets the day 10 and 14 notices, as normal (no «a domiciliar»)', async () => {
    mockTree([leaf({ name: 'Modelo 349 - Intracomunitarias' })])
    const day10 = await listObligacionNoticeCandidates({ clock: clockOn(10), slot: 'morning' })

    mockTree([leaf({ name: 'Modelo 349 - Intracomunitarias' })])
    const day14 = await listObligacionNoticeCandidates({ clock: clockOn(14), slot: 'morning' })

    expect(day10.map((candidate) => candidate.kind)).toEqual(['normal'])
    expect(day14.map((candidate) => candidate.kind)).toEqual(['normal'])
  })

  it('only returns the presentation notice in the presentation slot, never in the morning one', async () => {
    mockTree([leaf()], null)
    const morning = await listObligacionNoticeCandidates({ clock: clockOn(20), slot: 'morning' })

    mockTree([leaf()])
    const afternoon = await listObligacionNoticeCandidates({
      clock: clockOn(20, 14),
      slot: 'presentation',
    })

    expect(morning).toEqual([])
    expect(afternoon.map((candidate) => candidate.kind)).toEqual(['presentacion'])
  })

  it('keeps a done task (it may be missing its document) but drops a cancelled one', async () => {
    mockTree([leaf({ id: 3, state: 'done' }), leaf({ id: 4, state: 'canceled' })])

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result.map((candidate) => candidate.taskId)).toEqual([3])
    expect(result[0].attachmentCount).toBe(0)
  })

  it('does not query attachments when no task has a notice today', async () => {
    odooSearchRead
      .mockResolvedValueOnce([root])
      .mockResolvedValueOnce([period])
      .mockResolvedValueOnce([leaf()])
      .mockResolvedValueOnce([project])

    const result = await listObligacionNoticeCandidates({ clock: clockOn(1), slot: 'morning' })

    expect(result).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(4)
  })

  it('skips a leaf task whose project has a partner id but no resolvable partner name', async () => {
    mockTree([leaf()], null, { projectRow: { id: 10, partner_id: [99, ''] } })

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result).toEqual([])
  })

  it('skips leaf tasks with no deducible deadline (e.g. Mensuales) without crashing', async () => {
    mockTree([leaf({ name: 'Modelo 111 - Retenciones' })], null, { periodName: 'Mensuales' })

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result).toEqual([])
  })

  it('ignores root tasks outside the current/previous fiscal year', async () => {
    odooSearchRead.mockResolvedValueOnce([
      { id: 1, name: `Obligaciones Fiscales [${YEAR - 5}]`, project_id: [10, 'Proyecto'] },
    ])

    const result = await listObligacionNoticeCandidates({ clock: clockOn(18), slot: 'morning' })

    expect(result).toEqual([])
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })
})
