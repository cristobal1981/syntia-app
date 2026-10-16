import type { Invoice, InvoiceKind } from '@/src/modules/facturacion/domain/types'

/** Series separadas: las rectificativas llevan numeración propia (art. 6.1.b del Reglamento). */
export const INVOICE_SERIES: Record<InvoiceKind, string> = {
  ordinaria: 'F',
  rectificativa: 'R',
}

export function formatInvoiceNumber(series: string, year: number, sequence: number): string {
  return `${series}-${year}-${String(sequence).padStart(4, '0')}`
}

function isIssued(invoice: Invoice, series: string): boolean {
  return invoice.direction === 'emitida' && invoice.status === 'definitiva' && invoice.series === series
}

/** Siguiente número de la serie en ese año: correlativo y sin saltos (empieza de nuevo cada año). */
export function nextSequence(invoices: Invoice[], series: string, year: number): number {
  const used = invoices
    .filter((invoice) => isIssued(invoice, series) && invoice.issueDate.startsWith(`${year}-`))
    .map((invoice) => invoice.sequence ?? 0)
  return used.length === 0 ? 1 : Math.max(...used) + 1
}

export type NumberingIssue =
  | { kind: 'gap'; series: string; year: number; missing: number }
  | { kind: 'duplicate'; series: string; year: number; sequence: number }
  | { kind: 'format'; invoiceId: string; invoiceNumber: string }
  | { kind: 'chronology'; series: string; invoiceId: string; invoiceNumber: string }

/**
 * Comprueba la integridad de la numeración de las emitidas expedidas: correlativa y
 * sin saltos por serie y año, sin repetidos, con el formato esperado y en orden de fecha.
 */
export function verifyNumbering(invoices: Invoice[]): NumberingIssue[] {
  const issued = invoices.filter((invoice) => invoice.direction === 'emitida' && invoice.status === 'definitiva')
  const issues: NumberingIssue[] = []
  const groups = new Map<string, Invoice[]>()

  for (const invoice of issued) {
    const year = Number(invoice.issueDate.slice(0, 4))
    if (invoice.invoiceNumber !== formatInvoiceNumber(invoice.series, year, invoice.sequence ?? 0)) {
      issues.push({ kind: 'format', invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber })
    }
    const key = `${invoice.series}|${year}`
    groups.set(key, [...(groups.get(key) ?? []), invoice])
  }

  for (const [key, group] of groups) {
    const [series, yearText] = key.split('|')
    const year = Number(yearText)
    const sequences = group.map((invoice) => invoice.sequence ?? 0).sort((a, b) => a - b)

    sequences.forEach((sequence, index) => {
      if (index > 0 && sequence === sequences[index - 1]) issues.push({ kind: 'duplicate', series, year, sequence })
    })
    for (let expected = 1; expected <= (sequences.at(-1) ?? 0); expected += 1) {
      if (!sequences.includes(expected)) issues.push({ kind: 'gap', series, year, missing: expected })
    }

    const bySequence = [...group].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    bySequence.forEach((invoice, index) => {
      if (index > 0 && invoice.issueDate < bySequence[index - 1].issueDate) {
        issues.push({ kind: 'chronology', series, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber })
      }
    })
  }

  return issues
}

/** Fecha de la última factura expedida en la serie; la siguiente no puede ser anterior. */
export function lastIssueDate(invoices: Invoice[], series: string): string | null {
  const dates = invoices.filter((invoice) => isIssued(invoice, series)).map((invoice) => invoice.issueDate)
  return dates.length === 0 ? null : dates.reduce((latest, date) => (date > latest ? date : latest))
}
