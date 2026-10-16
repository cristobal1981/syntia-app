import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { deductibleExpenseCents } from '@/src/modules/facturacion/domain/compute-invoice'
import { QUARTERLY_TAX_MODEL } from '@/src/modules/facturacion/domain/tax-rates'
import { quarterOf, yearOf, type Quarter } from '@/src/modules/facturacion/domain/periods'
import type { Invoice, TaxRegime } from '@/src/modules/facturacion/domain/types'

/** Pago fraccionado de IRPF (modelo 130) en estimación directa: 20 % del rendimiento neto. */
const FRACTIONAL_PAYMENT_PERCENT = 20

type IndirectTaxSummary = {
  regime: TaxRegime
  model: string
  chargedCents: number
  deductibleCents: number
  /** Repercutido − soportado: positivo a ingresar, negativo a compensar o devolver. */
  resultCents: number
}

export type QuarterSummary = {
  quarter: Quarter
  incomeCents: number
  expenseCents: number
  /** Ingresos − gastos deducibles del trimestre. */
  netCents: number
  indirectTaxes: IndirectTaxSummary[]
  /** Retenciones que nos practican en nuestras facturas emitidas (a descontar en el 130). */
  withholdingsSufferedCents: number
  /** Retenciones que practicamos en facturas recibidas (modelos 111 y 115). */
  withholdingsAppliedCents: number
  /** Pago fraccionado orientativo del modelo 130 de este trimestre. */
  fractionalPaymentCents: number
}

const QUARTERS: readonly Quarter[] = [1, 2, 3, 4]

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0)
}

function indirectTaxSummaries(invoices: Invoice[]): IndirectTaxSummary[] {
  const regimes = [...new Set(invoices.map((invoice) => invoice.regime))].sort()

  return regimes.map((regime) => {
    const ofRegime = invoices.filter((invoice) => invoice.regime === regime)
    const chargedCents = sum(
      ofRegime.filter((invoice) => invoice.direction === 'emitida'),
      (invoice) => invoice.taxCents
    )
    const deductibleCents = sum(
      ofRegime.filter((invoice) => invoice.direction === 'recibida'),
      (invoice) => invoice.taxCents
    )
    return {
      regime,
      model: QUARTERLY_TAX_MODEL[regime],
      chargedCents,
      deductibleCents,
      resultCents: chargedCents - deductibleCents,
    }
  })
}

/**
 * Resumen fiscal orientativo de un año, trimestre a trimestre. El pago
 * fraccionado sigue la mecánica del modelo 130: 20 % del rendimiento neto
 * acumulado del año, menos las retenciones soportadas acumuladas y los pagos
 * de trimestres anteriores, sin bajar de cero. No es una liquidación.
 */
export function buildYearTaxSummary(invoices: Invoice[], year: number): QuarterSummary[] {
  const ofYear = accountedInvoices(invoices).filter((invoice) => yearOf(invoice.issueDate) === year)

  let accumulatedNetCents = 0
  let accumulatedWithholdingsCents = 0
  let accumulatedPaymentsCents = 0

  return QUARTERS.map((quarter) => {
    const ofQuarter = ofYear.filter((invoice) => quarterOf(invoice.issueDate) === quarter)
    const emitted = ofQuarter.filter((invoice) => invoice.direction === 'emitida')
    const received = ofQuarter.filter((invoice) => invoice.direction === 'recibida')

    const incomeCents = sum(emitted, (invoice) => invoice.baseCents)
    const expenseCents = sum(received, deductibleExpenseCents)
    const netCents = incomeCents - expenseCents
    const withholdingsSufferedCents = sum(emitted, (invoice) => invoice.withholdingCents)
    const withholdingsAppliedCents = sum(received, (invoice) => invoice.withholdingCents)

    accumulatedNetCents += netCents
    accumulatedWithholdingsCents += withholdingsSufferedCents
    const fractionalPaymentCents = Math.max(
      0,
      Math.round((accumulatedNetCents * FRACTIONAL_PAYMENT_PERCENT) / 100) -
        accumulatedWithholdingsCents -
        accumulatedPaymentsCents
    )
    accumulatedPaymentsCents += fractionalPaymentCents

    return {
      quarter,
      incomeCents,
      expenseCents,
      netCents,
      indirectTaxes: indirectTaxSummaries(ofQuarter),
      withholdingsSufferedCents,
      withholdingsAppliedCents,
      fractionalPaymentCents,
    }
  })
}
