import { describe, expect, it } from 'vitest'

import { buildJournal } from '@/src/modules/facturacion/domain/journal'
import { buildLedger, buildTrialBalance } from '@/src/modules/facturacion/domain/ledger'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

const accounted = accountedInvoices([...SAMPLE_INVOICES])
const ledger = buildLedger(buildJournal([...SAMPLE_INVOICES]))

describe('buildLedger', () => {
  it('ordena las cuentas por código', () => {
    const codes = ledger.map((account) => account.account)
    expect(codes).toEqual([...codes].sort())
  })

  it('el saldo acumulado de cada apunte es debe − haber hasta ese punto', () => {
    for (const account of ledger) {
      let running = 0
      for (const line of account.lines) {
        running += line.debitCents - line.creditCents
        expect(line.balanceCents, `${account.account} asiento ${line.entryNumber}`).toBe(running)
      }
      expect(account.balanceCents).toBe(running)
    }
  })

  it('las sumas del mayor igualan las del diario: debe total = haber total', () => {
    const debit = ledger.reduce((total, account) => total + account.debitCents, 0)
    const credit = ledger.reduce((total, account) => total + account.creditCents, 0)
    expect(debit).toBe(credit)
    expect(debit).toBeGreaterThan(0)
  })

  it('las facturas emitidas pendientes de cobro dejan saldo deudor en clientes', () => {
    const clients = ledger.find((account) => account.account === '430')!
    const pendingTotal = accounted.filter(
      (invoice) => invoice.direction === 'emitida' && !invoice.paymentDate
    ).reduce((total, invoice) => total + invoice.totalCents, 0)
    expect(pendingTotal).toBeGreaterThan(0)
    expect(clients.balanceCents).toBe(pendingTotal)
  })
})

describe('buildTrialBalance', () => {
  const trial = buildTrialBalance(ledger)

  it('reparte el saldo en deudor o acreedor, nunca en ambos', () => {
    for (const row of trial) {
      expect(row.debtorBalanceCents === 0 || row.creditorBalanceCents === 0, row.account).toBe(true)
      expect(row.debtorBalanceCents - row.creditorBalanceCents).toBe(row.debitCents - row.creditCents)
    }
  })

  it('suma de saldos deudores = suma de saldos acreedores', () => {
    const debtor = trial.reduce((total, row) => total + row.debtorBalanceCents, 0)
    const creditor = trial.reduce((total, row) => total + row.creditorBalanceCents, 0)
    expect(debtor).toBe(creditor)
  })
})
