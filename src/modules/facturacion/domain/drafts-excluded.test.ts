import { describe, expect, it } from 'vitest'

import { buildMonthlySeries, buildPendingSummary, listOverdueInvoices } from '@/src/modules/facturacion/domain/dashboard'
import { accountedInvoices, isAccounted } from '@/src/modules/facturacion/domain/invoice-rules'
import { buildParties } from '@/src/modules/facturacion/domain/parties'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

const all: Invoice[] = [...SAMPLE_INVOICES]
const accounted = accountedInvoices(all)
const TODAY = '2026-10-16'

describe('un borrador no cuenta en el panel ni en los saldos', () => {
  it('los datos de ejemplo incluyen un borrador, y no cuenta como expedido', () => {
    const drafts = all.filter((invoice) => invoice.status === 'borrador')
    expect(drafts.length).toBeGreaterThan(0)
    expect(drafts.some(isAccounted)).toBe(false)
    expect(accounted).toHaveLength(all.length - drafts.length)
  })

  it('clientes y panel dan lo mismo con o sin los borradores', () => {
    expect(buildParties(all)).toEqual(buildParties(accounted))
    expect(buildMonthlySeries(all, 2026)).toEqual(buildMonthlySeries(accounted, 2026))
    expect(buildPendingSummary(all, TODAY)).toEqual(buildPendingSummary(accounted, TODAY))
    expect(listOverdueInvoices(all, TODAY, 10)).toEqual(listOverdueInvoices(accounted, TODAY, 10))
  })
})
