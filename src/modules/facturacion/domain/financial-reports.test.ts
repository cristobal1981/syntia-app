import { describe, expect, it } from 'vitest'

import { buildJournal } from '@/src/modules/facturacion/domain/journal'
import { buildLedger } from '@/src/modules/facturacion/domain/ledger'
import { buildBalanceSheet, buildProfitAndLoss } from '@/src/modules/facturacion/domain/financial-reports'
import { buildIncomeExpenseBook } from '@/src/modules/facturacion/domain/books'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

const invoices = [...SAMPLE_INVOICES]
const accounted = accountedInvoices(invoices)
const ledger = buildLedger(buildJournal(invoices))

describe('buildProfitAndLoss', () => {
  const pl = buildProfitAndLoss(ledger)

  it('ingresos = grupo 7 y gastos = grupo 6, y el resultado es su diferencia', () => {
    expect(pl.income.every((line) => ['700', '705'].includes(line.account))).toBe(true)
    expect(pl.expenses.every((line) => line.account.startsWith('6'))).toBe(true)
    expect(pl.resultCents).toBe(pl.incomeCents - pl.expenseCents)
  })

  it('los ingresos son la base de las emitidas', () => {
    const base = accounted.filter((i) => i.direction === 'emitida').reduce((t, i) => t + i.baseCents, 0)
    expect(pl.incomeCents).toBe(base)
  })

  it('los gastos contables son la base completa de las recibidas (sin aplicar deducibilidad fiscal)', () => {
    const base = accounted.filter((i) => i.direction === 'recibida').reduce((t, i) => t + i.baseCents, 0)
    expect(pl.expenseCents).toBe(base)
    expect(pl.expenseCents).toBeGreaterThanOrEqual(buildIncomeExpenseBook(invoices).expenseCents)
  })

  it('sin asientos todo es cero', () => {
    expect(buildProfitAndLoss([])).toEqual({ income: [], expenses: [], incomeCents: 0, expenseCents: 0, resultCents: 0 })
  })
})

describe('buildBalanceSheet', () => {
  const balance = buildBalanceSheet(ledger)

  it('el activo es igual al pasivo más el patrimonio neto (el balance cuadra)', () => {
    expect(balance.assetsCents).toBe(balance.liabilitiesAndEquityCents)
    expect(balance.assetsCents).toBeGreaterThan(0)
  })

  it('el resultado del balance es el de pérdidas y ganancias', () => {
    expect(balance.resultCents).toBe(buildProfitAndLoss(ledger).resultCents)
  })

  it('clientes y bancos en el activo; proveedores y Hacienda acreedora en el pasivo', () => {
    const assets = balance.assets.map((line) => line.account)
    const liabilities = balance.liabilities.map((line) => line.account)

    expect(assets).toContain('430')
    expect(assets).toContain('472')
    expect(liabilities).toContain('477')
    expect(liabilities.some((account) => account === '410' || account === '400')).toBe(true)
    expect([...assets, ...liabilities].every((account) => /^[45]/.test(account))).toBe(true)
  })

  it('todos los importes de las líneas son positivos', () => {
    for (const line of [...balance.assets, ...balance.liabilities]) {
      expect(line.amountCents).toBeGreaterThan(0)
    }
  })

  it('cuadra también con un solo mes de facturas', () => {
    const january = accounted.filter((i) => i.issueDate.startsWith('2026-01'))
    const sheet = buildBalanceSheet(buildLedger(buildJournal(january)))
    expect(sheet.assetsCents).toBe(sheet.liabilitiesAndEquityCents)
  })
})
