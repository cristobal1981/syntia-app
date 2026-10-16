import type { LedgerAccount } from '@/src/modules/facturacion/domain/ledger'

export type ReportLine = { account: string; accountName: string; amountCents: number }

export type ProfitAndLoss = {
  income: ReportLine[]
  expenses: ReportLine[]
  incomeCents: number
  expenseCents: number
  /** Ingresos − gastos (antes de impuestos). */
  resultCents: number
}

function sum(lines: ReportLine[]): number {
  return lines.reduce((total, line) => total + line.amountCents, 0)
}

/** Cuenta de pérdidas y ganancias: grupo 7 (ingresos) menos grupo 6 (gastos) del libro mayor. */
export function buildProfitAndLoss(ledger: LedgerAccount[]): ProfitAndLoss {
  const income: ReportLine[] = []
  const expenses: ReportLine[] = []

  for (const account of ledger) {
    if (account.account.startsWith('7')) {
      income.push({ account: account.account, accountName: account.accountName, amountCents: account.creditCents - account.debitCents })
    } else if (account.account.startsWith('6')) {
      expenses.push({ account: account.account, accountName: account.accountName, amountCents: account.debitCents - account.creditCents })
    }
  }

  const incomeCents = sum(income)
  const expenseCents = sum(expenses)
  return { income, expenses, incomeCents, expenseCents, resultCents: incomeCents - expenseCents }
}

export type BalanceSheet = {
  assets: ReportLine[]
  liabilities: ReportLine[]
  /** Resultado del ejercicio (patrimonio neto): ingresos − gastos. */
  resultCents: number
  assetsCents: number
  liabilitiesCents: number
  /** Pasivo + patrimonio neto: debe coincidir con el activo. */
  liabilitiesAndEquityCents: number
}

/**
 * Balance de situación a partir del mayor: las cuentas de los grupos 4 y 5 con
 * saldo deudor son activo y con saldo acreedor, pasivo; el resultado del
 * ejercicio (grupos 6 y 7) cierra el patrimonio neto.
 */
export function buildBalanceSheet(ledger: LedgerAccount[]): BalanceSheet {
  const assets: ReportLine[] = []
  const liabilities: ReportLine[] = []

  for (const account of ledger) {
    if (!account.account.startsWith('4') && !account.account.startsWith('5')) continue
    if (account.balanceCents === 0) continue

    if (account.balanceCents > 0) {
      assets.push({ account: account.account, accountName: account.accountName, amountCents: account.balanceCents })
    } else {
      liabilities.push({ account: account.account, accountName: account.accountName, amountCents: -account.balanceCents })
    }
  }

  const resultCents = buildProfitAndLoss(ledger).resultCents
  const assetsCents = sum(assets)
  const liabilitiesCents = sum(liabilities)
  return {
    assets,
    liabilities,
    resultCents,
    assetsCents,
    liabilitiesCents,
    liabilitiesAndEquityCents: liabilitiesCents + resultCents,
  }
}
