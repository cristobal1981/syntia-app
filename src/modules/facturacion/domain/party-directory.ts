import { normalizeForSearch } from '@/src/modules/facturacion/domain/search'
import { isAccounted } from '@/src/modules/facturacion/domain/invoice-rules'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { isValidTaxId, normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { clientKindFromTaxId, territoryFromAddress, type ClientKind, type Territory } from '@/src/modules/facturacion/domain/tax-profile'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

/** Un cliente del directorio. */
export type Party = {
  id: string
  name: string
  taxId: string
  address: string
  postalCode: string
  city: string
  province: string
  email: string
  phone: string
  /** Dónde está establecido a efectos de IGIC/IVA. */
  territory: Territory
  /** Si actúa como particular, autónomo o empresa (decide la retención). */
  kind: ClientKind
  /** Días de plazo de pago por defecto en sus facturas. */
  paymentTermDays: number
  notes: string
}

export type PartyErrorKey =
  | 'nameRequired'
  | 'taxIdInvalid'
  | 'postalCodeInvalid'
  | 'emailInvalid'
  | 'paymentTermInvalid'
  | 'tooLong'

export function emptyParty(): Omit<Party, 'id'> {
  return {
    name: '',
    taxId: '',
    address: '',
    postalCode: '',
    city: '',
    province: '',
    email: '',
    phone: '',
    territory: 'canarias',
    kind: 'empresa',
    paymentTermDays: DEFAULT_PAYMENT_TERM_DAYS,
    notes: '',
  }
}

export function validateParty(party: Party): Partial<Record<keyof Party, PartyErrorKey>> {
  const errors: Partial<Record<keyof Party, PartyErrorKey>> = {}
  if (!party.name.trim()) errors.name = 'nameRequired'
  else if (party.name.trim().length > 120) errors.name = 'tooLong'
  if (party.address.trim().length > 200) errors.address = 'tooLong'

  if (!isValidTaxId(party.taxId)) errors.taxId = 'taxIdInvalid'

  if (party.postalCode.trim() && !/^\d{5}$/.test(party.postalCode.trim())) errors.postalCode = 'postalCodeInvalid'
  if (party.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email.trim())) errors.email = 'emailInvalid'
  if (!Number.isInteger(party.paymentTermDays) || party.paymentTermDays < 0 || party.paymentTermDays > 365) {
    errors.paymentTermDays = 'paymentTermInvalid'
  }
  return errors
}

/** Territorio y tipo sugeridos por los datos del cliente; quien da el alta puede cambiarlos. */
export function suggestedTaxProfile(party: Pick<Party, 'taxId' | 'postalCode' | 'province'>): Pick<Party, 'territory' | 'kind'> {
  return { territory: territoryFromAddress(party), kind: clientKindFromTaxId(party.taxId) }
}

/** Domicilio en una línea, tal como se copia a la factura. */
export function formatPartyAddress(party: Pick<Party, 'address' | 'postalCode' | 'city' | 'province'>): string {
  return [party.address, [party.postalCode, party.city].filter(Boolean).join(' '), party.province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

function references(party: Pick<Party, 'taxId'>, invoice: Invoice): boolean {
  return normalizeTaxId(invoice.counterpartyTaxId) === normalizeTaxId(party.taxId)
}

function normalizeName(name: string): string {
  return normalizeForSearch(name)
    .replace(/\b(s\.?\s?l\.?u?\.?|s\.?\s?a\.?|s\.?\s?l\.?l\.?|c\.?\s?b\.?)(?=\s|$)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Clientes que podrían ser el mismo que el que se está dando de alta: mismo NIF o nombre parecido
 * (sin tildes, mayúsculas ni forma societaria). Es solo una sugerencia: quien da el alta decide.
 */
export function findSimilarParties(candidate: Pick<Party, 'id' | 'name' | 'taxId'>, parties: Party[]): Party[] {
  const taxId = normalizeTaxId(candidate.taxId)
  const name = normalizeName(candidate.name)

  return parties.filter((other) => {
    if (other.id === candidate.id) return false
    if (taxId && normalizeTaxId(other.taxId) === taxId) return true
    const otherName = normalizeName(other.name)
    if (name.length < 3 || otherName.length < 3) return false
    return name === otherName || otherName.includes(name) || name.includes(otherName)
  })
}

export type PartyWithStats = Party & {
  invoiceCount: number
  /** Total facturado al cliente. */
  billedCents: number
  pendingCents: number
}

/** El directorio con lo facturado y lo pendiente de cada cliente (solo facturas contabilizadas). */
export function partiesWithStats(parties: Party[], invoices: Invoice[]): PartyWithStats[] {
  return parties.map((party) => {
    const own = invoices.filter((invoice) => isAccounted(invoice) && references(party, invoice))
    return {
      ...party,
      invoiceCount: own.length,
      billedCents: own.reduce((sum, invoice) => sum + invoice.totalCents, 0),
      pendingCents: own.filter((invoice) => invoice.kind === 'ordinaria' && !invoice.paymentDate).reduce((sum, invoice) => sum + invoice.totalCents, 0),
    }
  })
}

/** Un cliente con facturas (aunque sean borradores) no se borra: las facturas lo citan. */
export function canDeleteParty(party: Pick<Party, 'taxId'>, invoices: Invoice[]): boolean {
  return !invoices.some((invoice) => references(party, invoice))
}

/** Directorio inicial a partir de las facturas existentes: un cliente por NIF. */
export function partiesFromInvoices(invoices: Invoice[]): Party[] {
  const seen = new Map<string, Party>()
  const ordered = [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))

  for (const invoice of ordered) {
    const key = normalizeTaxId(invoice.counterpartyTaxId)
    if (!key || seen.has(key)) continue
    seen.set(key, {
      ...emptyParty(),
      id: `tercero-${seen.size + 1}`,
      name: invoice.counterpartyName,
      taxId: key,
      address: invoice.counterpartyAddress,
      territory: invoice.counterpartyTerritory,
      kind: invoice.counterpartyKind,
    })
  }
  return [...seen.values()]
}
