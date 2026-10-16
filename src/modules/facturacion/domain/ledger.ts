import type { JournalEntry } from '@/src/modules/facturacion/domain/journal'

type LedgerLine = {
  date: string
  entryNumber: number
  concept: string
  debitCents: number
  creditCents: number
  /** Saldo acumulado (debe − haber) tras este apunte. */
  balanceCents: number
}

export type LedgerAccount = {
  account: string
  accountName: string
  lines: LedgerLine[]
  debitCents: number
  creditCents: number
  /** Debe − haber: positivo es saldo deudor, negativo acreedor. */
  balanceCents: number
}

/** Libro mayor: los apuntes del diario agrupados por cuenta, con saldo acumulado. */
export function buildLedger(entries: JournalEntry[]): LedgerAccount[] {
  const accounts = new Map<string, LedgerAccount>()

  for (const entry of entries) {
    for (const line of entry.lines) {
      let account = accounts.get(line.account)
      if (!account) {
        account = {
          account: line.account,
          accountName: line.accountName,
          lines: [],
          debitCents: 0,
          creditCents: 0,
          balanceCents: 0,
        }
        accounts.set(line.account, account)
      }

      account.debitCents += line.debitCents
      account.creditCents += line.creditCents
      account.balanceCents += line.debitCents - line.creditCents
      account.lines.push({
        date: entry.date,
        entryNumber: entry.number,
        concept: entry.concept,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
        balanceCents: account.balanceCents,
      })
    }
  }

  return [...accounts.values()].sort((a, b) => a.account.localeCompare(b.account))
}

export type TrialBalanceRow = {
  account: string
  accountName: string
  debitCents: number
  creditCents: number
  debtorBalanceCents: number
  creditorBalanceCents: number
}

/** Balance de sumas y saldos: sumas del debe y del haber por cuenta y su saldo. */
export function buildTrialBalance(ledger: LedgerAccount[]): TrialBalanceRow[] {
  return ledger.map((account) => ({
    account: account.account,
    accountName: account.accountName,
    debitCents: account.debitCents,
    creditCents: account.creditCents,
    debtorBalanceCents: Math.max(account.balanceCents, 0),
    creditorBalanceCents: Math.max(-account.balanceCents, 0),
  }))
}
