import { getCategory } from '@/src/modules/facturacion/domain/categories'
import { isAccounted } from '@/src/modules/facturacion/domain/invoice-rules'
import { compareInvoices } from '@/src/modules/facturacion/domain/periods'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

type JournalLine = {
  account: string
  accountName: string
  debitCents: number
  creditCents: number
}

export type JournalEntry = {
  /** Número de asiento, correlativo dentro de lo que se muestra. */
  number: number
  date: string
  concept: string
  invoiceId: string
  kind: 'registro' | 'pago'
  lines: JournalLine[]
}

const BANKS = { account: '572', name: 'Bancos e instituciones de crédito c/c' }

/** Un importe negativo (abono de una rectificativa) pasa al lado contrario: el asiento sigue cuadrando. */
function debit(account: string, accountName: string, cents: number): JournalLine {
  return cents < 0
    ? { account, accountName, debitCents: 0, creditCents: -cents }
    : { account, accountName, debitCents: cents, creditCents: 0 }
}

function credit(account: string, accountName: string, cents: number): JournalLine {
  return cents < 0
    ? { account, accountName, debitCents: -cents, creditCents: 0 }
    : { account, accountName, debitCents: 0, creditCents: cents }
}

function nonZero(lines: JournalLine[]): JournalLine[] {
  return lines.filter((line) => line.debitCents !== 0 || line.creditCents !== 0)
}

function taxAccountName(invoice: Invoice, side: 'soportado' | 'repercutido'): string {
  const tax = invoice.regime === 'igic' ? 'IGIC' : 'IVA'
  return `H.P. ${tax} ${side}`
}

/** Asiento de registro de la factura (devengo): gasto o ingreso, impuesto, retención y tercero. */
function registrationLines(invoice: Invoice): JournalLine[] {
  const category = getCategory(invoice.categoryId, invoice.direction)

  if (invoice.direction === 'recibida') {
    return nonZero([
      debit(category.account, category.accountName, invoice.baseCents),
      debit('472', taxAccountName(invoice, 'soportado'), invoice.taxCents),
      credit('4751', 'H.P. acreedora por retenciones practicadas', invoice.withholdingCents),
      credit(category.counterpartyAccount, category.counterpartyAccountName, invoice.totalCents),
    ])
  }

  return nonZero([
    debit(category.counterpartyAccount, category.counterpartyAccountName, invoice.totalCents),
    debit('473', 'H.P. retenciones y pagos a cuenta', invoice.withholdingCents),
    credit(category.account, category.accountName, invoice.baseCents),
    credit('477', taxAccountName(invoice, 'repercutido'), invoice.taxCents),
  ])
}

/** Asiento de pago (recibidas) o de cobro (emitidas) por el total de la factura. */
function settlementLines(invoice: Invoice): JournalLine[] {
  const category = getCategory(invoice.categoryId, invoice.direction)

  if (invoice.direction === 'recibida') {
    return [
      debit(category.counterpartyAccount, category.counterpartyAccountName, invoice.totalCents),
      credit(BANKS.account, BANKS.name, invoice.totalCents),
    ]
  }

  return [
    debit(BANKS.account, BANKS.name, invoice.totalCents),
    credit(category.counterpartyAccount, category.counterpartyAccountName, invoice.totalCents),
  ]
}

function describe(invoice: Invoice, kind: 'registro' | 'pago'): string {
  const subject = `${invoice.counterpartyName} — ${invoice.invoiceNumber}`
  if (kind === 'registro') {
    if (invoice.kind === 'rectificativa') return `Factura rectificativa ${subject}`
    return `${invoice.direction === 'recibida' ? 'Factura recibida' : 'Factura emitida'} ${subject}`
  }
  if (invoice.kind === 'rectificativa') return `Devolución factura rectificativa ${subject}`
  return `${invoice.direction === 'recibida' ? 'Pago' : 'Cobro'} factura ${subject}`
}

type PendingEntry = Omit<JournalEntry, 'number'>

/**
 * Libro diario: un asiento de registro por factura y, si consta fecha de pago o
 * cobro, otro de tesorería. Orden cronológico; a igual fecha, primero el registro.
 */
export function buildJournal(invoices: Invoice[]): JournalEntry[] {
  const pending: PendingEntry[] = []

  for (const invoice of [...invoices].filter(isAccounted).sort(compareInvoices)) {
    pending.push({
      date: invoice.issueDate,
      concept: describe(invoice, 'registro'),
      invoiceId: invoice.id,
      kind: 'registro',
      lines: registrationLines(invoice),
    })

    if (invoice.paymentDate && invoice.totalCents !== 0) {
      pending.push({
        date: invoice.paymentDate,
        concept: describe(invoice, 'pago'),
        invoiceId: invoice.id,
        kind: 'pago',
        lines: settlementLines(invoice),
      })
    }
  }

  const kindOrder = { registro: 0, pago: 1 }
  const ordered = pending
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        a.entry.date.localeCompare(b.entry.date) ||
        kindOrder[a.entry.kind] - kindOrder[b.entry.kind] ||
        a.index - b.index
    )

  return ordered.map(({ entry }, index) => ({ ...entry, number: index + 1 }))
}

export function entryTotals(entry: Pick<JournalEntry, 'lines'>): { debitCents: number; creditCents: number } {
  return entry.lines.reduce(
    (totals, line) => ({
      debitCents: totals.debitCents + line.debitCents,
      creditCents: totals.creditCents + line.creditCents,
    }),
    { debitCents: 0, creditCents: 0 }
  )
}

export function isBalanced(entry: Pick<JournalEntry, 'lines'>): boolean {
  const { debitCents, creditCents } = entryTotals(entry)
  return debitCents === creditCents
}
