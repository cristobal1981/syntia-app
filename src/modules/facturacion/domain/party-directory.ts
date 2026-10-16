import { isAccounted } from '@/src/modules/facturacion/domain/invoice-rules'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { isValidTaxId, normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

export type PartyKind = 'cliente' | 'proveedor'

export type Party = {
  id: string
  kind: PartyKind
  name: string
  taxId: string
  address: string
  postalCode: string
  city: string
  province: string
  email: string
  phone: string
  /** Días de plazo de pago por defecto en sus facturas. */
  paymentTermDays: number
  notes: string
}

export type PartyErrorKey =
  | 'nameRequired'
  | 'taxIdInvalid'
  | 'taxIdDuplicate'
  | 'postalCodeInvalid'
  | 'emailInvalid'
  | 'paymentTermInvalid'

export const KIND_OF_DIRECTION = { emitida: 'cliente', recibida: 'proveedor' } as const

export function emptyParty(kind: PartyKind): Omit<Party, 'id'> {
  return {
    kind,
    name: '',
    taxId: '',
    address: '',
    postalCode: '',
    city: '',
    province: '',
    email: '',
    phone: '',
    paymentTermDays: DEFAULT_PAYMENT_TERM_DAYS,
    notes: '',
  }
}

export function validateParty(party: Party, others: Party[]): Partial<Record<keyof Party, PartyErrorKey>> {
  const errors: Partial<Record<keyof Party, PartyErrorKey>> = {}
  if (!party.name.trim()) errors.name = 'nameRequired'

  if (!isValidTaxId(party.taxId)) {
    errors.taxId = 'taxIdInvalid'
  } else if (
    others.some(
      (other) => other.id !== party.id && other.kind === party.kind && normalizeTaxId(other.taxId) === normalizeTaxId(party.taxId)
    )
  ) {
    errors.taxId = 'taxIdDuplicate'
  }

  if (party.postalCode.trim() && !/^\d{5}$/.test(party.postalCode.trim())) errors.postalCode = 'postalCodeInvalid'
  if (party.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email.trim())) errors.email = 'emailInvalid'
  if (!Number.isInteger(party.paymentTermDays) || party.paymentTermDays < 0 || party.paymentTermDays > 365) {
    errors.paymentTermDays = 'paymentTermInvalid'
  }
  return errors
}

/** Domicilio en una línea, tal como se copia a la factura. */
export function formatPartyAddress(party: Pick<Party, 'address' | 'postalCode' | 'city' | 'province'>): string {
  return [party.address, [party.postalCode, party.city].filter(Boolean).join(' '), party.province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

function references(party: Pick<Party, 'kind' | 'taxId'>, invoice: Invoice): boolean {
  return KIND_OF_DIRECTION[invoice.direction] === party.kind && normalizeTaxId(invoice.counterpartyTaxId) === normalizeTaxId(party.taxId)
}

export type PartyWithStats = Party & {
  invoiceCount: number
  billedCents: number
  pendingCents: number
}

/** El directorio con lo facturado y lo pendiente de cada tercero (solo facturas contabilizadas). */
export function partiesWithStats(parties: Party[], invoices: Invoice[]): PartyWithStats[] {
  return parties.map((party) => {
    const own = invoices.filter((invoice) => isAccounted(invoice) && references(party, invoice))
    return {
      ...party,
      invoiceCount: own.length,
      billedCents: own.reduce((total, invoice) => total + invoice.totalCents, 0),
      pendingCents: own.filter((invoice) => !invoice.paymentDate).reduce((total, invoice) => total + invoice.totalCents, 0),
    }
  })
}

/** Un tercero con facturas (aunque sean borradores) no se borra: las facturas lo citan. */
export function canDeleteParty(party: Pick<Party, 'kind' | 'taxId'>, invoices: Invoice[]): boolean {
  return !invoices.some((invoice) => references(party, invoice))
}

/** Directorio inicial a partir de las facturas existentes: un tercero por rol y NIF. */
export function partiesFromInvoices(invoices: Invoice[]): Party[] {
  const seen = new Map<string, Party>()
  const ordered = [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))

  for (const invoice of ordered) {
    const kind = KIND_OF_DIRECTION[invoice.direction]
    const key = `${kind}:${normalizeTaxId(invoice.counterpartyTaxId)}`
    if (seen.has(key) || !invoice.counterpartyTaxId) continue
    seen.set(key, {
      ...emptyParty(kind),
      id: `tercero-${seen.size + 1}`,
      name: invoice.counterpartyName,
      taxId: normalizeTaxId(invoice.counterpartyTaxId),
      address: invoice.counterpartyAddress,
    })
  }
  return [...seen.values()]
}
