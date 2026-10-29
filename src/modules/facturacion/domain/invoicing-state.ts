import { emitInvoice, type EmissionIssue } from '@/src/modules/facturacion/domain/emission'
import { applyInvoiceChanges, canDeleteInvoice } from '@/src/modules/facturacion/domain/invoice-rules'
import type { InvoiceEvent, InvoiceEventType } from '@/src/modules/facturacion/domain/invoice-events'
import { DEMO_ISSUER, type Issuer } from '@/src/modules/facturacion/domain/issuer'
import { validateProduct, SAMPLE_PRODUCTS, type Product } from '@/src/modules/facturacion/domain/products'
import { canDeleteParty, validateParty, type Party } from '@/src/modules/facturacion/domain/party-directory'
import {
  buildRectificationDraft,
  validateRectification,
  type RectificationInput,
  type RectificationIssueCode,
} from '@/src/modules/facturacion/domain/rectification'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
import { SAMPLE_PARTIES } from '@/src/modules/facturacion/domain/sample-parties'
import type { Invoice, InvoiceDraft } from '@/src/modules/facturacion/domain/types'
import type { PartyErrorKey } from '@/src/modules/facturacion/domain/party-directory'

export type InvoicingState = {
  invoices: Invoice[]
  parties: Party[]
  products: Product[]
  issuer: Issuer
  events: InvoiceEvent[]
}

export function initialInvoicingState(): InvoicingState {
  return { invoices: [...SAMPLE_INVOICES], parties: [...SAMPLE_PARTIES], products: [...SAMPLE_PRODUCTS], issuer: DEMO_ISSUER, events: [] }
}

/** Dependencias externas (reloj e identificadores) para que las operaciones sean deterministas. */
export type OperationContext = { now: Date; newId: () => string }

function withEvent(
  state: InvoicingState,
  context: OperationContext,
  type: InvoiceEventType,
  invoiceId: string | null,
  summary: string
): InvoicingState {
  const event: InvoiceEvent = { id: context.newId(), at: context.now.toISOString(), invoiceId, type, summary }
  return { ...state, events: [...state.events, event] }
}

function label(invoice: Invoice): string {
  return invoice.invoiceNumber || 'borrador'
}

/** Campos de contenido que puede traer el formulario; el resto del ciclo de vida lo gestionan las operaciones. */
const CONTENT_KEYS = [
  'issueDate',
  'dueDate',
  'counterpartyName',
  'counterpartyTaxId',
  'counterpartyAddress',
  'counterpartyTerritory',
  'counterpartyKind',
  'concept',
  'lines',
  'categoryId',
  'regime',
  'baseCents',
  'taxRate',
  'taxCents',
  'withholdingRate',
  'withholdingCents',
  'taxNote',
  'totalCents',
  'paymentDate',
  'review',
  'source',
] as const satisfies readonly (keyof Invoice)[]

export type SaveInvoiceResult =
  | { ok: true; state: InvoicingState; invoice: Invoice }
  | { ok: false; error: 'locked'; fields: string[]; state: InvoicingState }
  | { ok: false; error: 'not_found'; state: InvoicingState }

/**
 * Crea o modifica una factura. Una factura ya emitida rechaza cualquier cambio de
 * contenido, y el intento queda anotado en el historial.
 */
export function saveInvoice(
  state: InvoicingState,
  draft: InvoiceDraft,
  context: OperationContext,
  existingId?: string
): SaveInvoiceResult {
  if (!existingId) {
    const invoice: Invoice = { ...draft, id: context.newId(), createdAt: context.now.toISOString() }
    return {
      ok: true,
      invoice,
      state: withEvent(
        { ...state, invoices: [...state.invoices, invoice] },
        context,
        'creada',
        invoice.id,
        invoice.status === 'borrador' ? 'Borrador creado' : `Factura ${label(invoice)} creada`
      ),
    }
  }

  const existing = state.invoices.find((invoice) => invoice.id === existingId)
  if (!existing) return { ok: false, error: 'not_found', state }

  const changes: Partial<Invoice> = {}
  for (const key of CONTENT_KEYS) Object.assign(changes, { [key]: draft[key] })

  const result = applyInvoiceChanges(existing, changes)
  if (!result.ok) {
    return {
      ok: false,
      error: 'locked',
      fields: result.fields,
      state: withEvent(
        state,
        context,
        'bloqueada',
        existing.id,
        `Intento de modificar la factura ${label(existing)} rechazado: ya está emitida (campos: ${result.fields.join(', ')})`
      ),
    }
  }

  return {
    ok: true,
    invoice: result.invoice,
    state: withEvent(
      { ...state, invoices: state.invoices.map((invoice) => (invoice.id === existing.id ? result.invoice : invoice)) },
      context,
      'modificada',
      existing.id,
      `Factura ${label(existing)} modificada`
    ),
  }
}

export type EmitResult =
  | { ok: true; state: InvoicingState; invoice: Invoice }
  | { ok: false; error: 'not_found'; state: InvoicingState }
  | { ok: false; error: 'invalid'; issues: EmissionIssue[]; state: InvoicingState }

/** Expide un borrador: le da número y lo bloquea. */
export function emitDraft(state: InvoicingState, invoiceId: string, context: OperationContext): EmitResult {
  const draft = state.invoices.find((invoice) => invoice.id === invoiceId)
  if (!draft) return { ok: false, error: 'not_found', state }

  const result = emitInvoice(draft, state.issuer, state.invoices, context.now)
  if (!result.ok) return { ok: false, error: 'invalid', issues: result.issues, state }

  return {
    ok: true,
    invoice: result.invoice,
    state: withEvent(
      { ...state, invoices: state.invoices.map((invoice) => (invoice.id === draft.id ? result.invoice : invoice)) },
      context,
      'expedida',
      draft.id,
      `Factura ${result.invoice.invoiceNumber} emitida`
    ),
  }
}

export type RectifyResult =
  | { ok: true; state: InvoicingState; invoice: Invoice }
  | { ok: false; error: 'not_found'; state: InvoicingState }
  | { ok: false; error: 'invalid'; issues: RectificationIssueCode[]; state: InvoicingState }
  | { ok: false; error: 'emission'; issues: EmissionIssue[]; state: InvoicingState }

/** Emite una factura rectificativa de una ya emitida (la original no se toca). */
export function rectifyInvoice(
  state: InvoicingState,
  originalId: string,
  input: RectificationInput,
  context: OperationContext
): RectifyResult {
  const original = state.invoices.find((invoice) => invoice.id === originalId)
  if (!original) return { ok: false, error: 'not_found', state }

  const issues = validateRectification(original, state.invoices, input)
  if (issues.length > 0) return { ok: false, error: 'invalid', issues, state }

  const draft = buildRectificationDraft(original, state.invoices, input)
  const created = saveInvoice(state, draft, context)
  if (!created.ok) return { ok: false, error: 'not_found', state }

  const emitted = emitDraft(created.state, created.invoice.id, context)
  if (!emitted.ok) {
    // La rectificativa no ha podido expedirse: no queda ningún borrador suelto.
    return emitted.error === 'invalid'
      ? { ok: false, error: 'emission', issues: emitted.issues, state }
      : { ok: false, error: 'not_found', state }
  }

  return {
    ok: true,
    invoice: emitted.invoice,
    state: withEvent(
      emitted.state,
      context,
      'rectificada',
      original.id,
      `Factura ${original.invoiceNumber} corregida por ${emitted.invoice.invoiceNumber}: ${input.reason.trim()}`
    ),
  }
}

export type RemoveResult =
  | { ok: true; state: InvoicingState }
  | { ok: false; error: 'locked' | 'not_found'; state: InvoicingState }

/** Solo se borran borradores; una expedida no se borra nunca. */
export function removeInvoice(state: InvoicingState, invoiceId: string, context: OperationContext): RemoveResult {
  const invoice = state.invoices.find((candidate) => candidate.id === invoiceId)
  if (!invoice) return { ok: false, error: 'not_found', state }

  if (!canDeleteInvoice(invoice)) {
    return {
      ok: false,
      error: 'locked',
      state: withEvent(state, context, 'bloqueada', invoice.id, `Intento de borrar la factura ${label(invoice)} rechazado: ya está emitida`),
    }
  }

  return {
    ok: true,
    state: withEvent(
      { ...state, invoices: state.invoices.filter((candidate) => candidate.id !== invoice.id) },
      context,
      'eliminada',
      invoice.id,
      `${invoice.status === 'borrador' ? 'Borrador' : `Factura ${label(invoice)}`} eliminada`
    ),
  }
}

/** Registrar el cobro o pago, o quitarlo: no forma parte de la factura, así que vale también con las expedidas. */
export function setPaymentDate(
  state: InvoicingState,
  invoiceId: string,
  paymentDate: string | null,
  context: OperationContext
): SaveInvoiceResult {
  return changeAllowedField(state, invoiceId, { paymentDate }, context, 'cobro', (invoice) =>
    paymentDate ? `Factura ${label(invoice)} marcada como pagada/cobrada el ${paymentDate}` : `Pago de la factura ${label(invoice)} retirado`
  )
}

export function setReview(
  state: InvoicingState,
  invoiceId: string,
  review: Invoice['review'],
  context: OperationContext
): SaveInvoiceResult {
  return changeAllowedField(state, invoiceId, { review }, context, 'revision', (invoice) => `Factura ${label(invoice)}: revisión ${review}`)
}

function changeAllowedField(
  state: InvoicingState,
  invoiceId: string,
  changes: Partial<Invoice>,
  context: OperationContext,
  type: InvoiceEventType,
  describe: (invoice: Invoice) => string
): SaveInvoiceResult {
  const existing = state.invoices.find((invoice) => invoice.id === invoiceId)
  if (!existing) return { ok: false, error: 'not_found', state }

  const result = applyInvoiceChanges(existing, changes)
  if (!result.ok) return { ok: false, error: 'locked', fields: result.fields, state }

  return {
    ok: true,
    invoice: result.invoice,
    state: withEvent(
      { ...state, invoices: state.invoices.map((invoice) => (invoice.id === existing.id ? result.invoice : invoice)) },
      context,
      type,
      existing.id,
      describe(result.invoice)
    ),
  }
}

export type SavePartyResult =
  | { ok: true; state: InvoicingState; party: Party }
  | { ok: false; errors: Partial<Record<keyof Party, PartyErrorKey>>; state: InvoicingState }

/**
 * Crea o actualiza un tercero. Las facturas ya expedidas guardan su propia copia de
 * los datos: cambiar el directorio no altera ninguna factura existente.
 */
export function saveParty(state: InvoicingState, party: Party, context: OperationContext): SavePartyResult {
  const errors = validateParty(party)
  if (Object.keys(errors).length > 0) return { ok: false, errors, state }

  const exists = state.parties.some((candidate) => candidate.id === party.id)
  const parties = exists ? state.parties.map((candidate) => (candidate.id === party.id ? party : candidate)) : [...state.parties, party]
  return {
    ok: true,
    party,
    state: withEvent({ ...state, parties }, context, 'modificada', null, `Tercero ${party.name} ${exists ? 'actualizado' : 'creado'}`),
  }
}

export type SaveProductResult =
  | { ok: true; state: InvoicingState; product: Product }
  | { ok: false; errors: ReturnType<typeof validateProduct>; state: InvoicingState }

export function saveProduct(state: InvoicingState, product: Product, context: OperationContext): SaveProductResult {
  const errors = validateProduct(product)
  if (Object.keys(errors).length > 0) return { ok: false, errors, state }

  const clean: Product = { ...product, name: product.name.trim() }
  const exists = state.products.some((candidate) => candidate.id === clean.id)
  const products = exists ? state.products.map((candidate) => (candidate.id === clean.id ? clean : candidate)) : [...state.products, clean]
  return {
    ok: true,
    product: clean,
    state: withEvent({ ...state, products }, context, 'modificada', null, `Producto ${clean.name} ${exists ? 'actualizado' : 'creado'}`),
  }
}

/** Quitar un producto del catálogo no toca las facturas: cada línea guarda su propia descripción y precio. */
export function removeProduct(state: InvoicingState, productId: string, context: OperationContext): InvoicingState {
  const product = state.products.find((candidate) => candidate.id === productId)
  if (!product) return state
  return withEvent(
    { ...state, products: state.products.filter((candidate) => candidate.id !== productId) },
    context,
    'eliminada',
    null,
    `Producto ${product.name} eliminado`
  )
}

export function removeParty(
  state: InvoicingState,
  partyId: string,
  context: OperationContext
): { ok: true; state: InvoicingState } | { ok: false; error: 'in_use' | 'not_found'; state: InvoicingState } {
  const party = state.parties.find((candidate) => candidate.id === partyId)
  if (!party) return { ok: false, error: 'not_found', state }
  if (!canDeleteParty(party, state.invoices)) return { ok: false, error: 'in_use', state }

  return {
    ok: true,
    state: withEvent(
      { ...state, parties: state.parties.filter((candidate) => candidate.id !== partyId) },
      context,
      'eliminada',
      null,
      `Tercero ${party.name} eliminado`
    ),
  }
}

export function saveIssuer(state: InvoicingState, issuer: Issuer, context: OperationContext): InvoicingState {
  return withEvent({ ...state, issuer }, context, 'modificada', null, 'Datos fiscales del emisor actualizados')
}
