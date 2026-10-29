import { initialInvoicingState, type InvoicingState, type OperationContext } from '@/src/modules/facturacion/domain/invoicing-state'
import { linesFromLegacy } from '@/src/modules/facturacion/domain/invoice-lines'
import { SAMPLE_PRODUCTS } from '@/src/modules/facturacion/domain/products'
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS, type Invoice } from '@/src/modules/facturacion/domain/types'

/**
 * Almacén MOCK de facturación: todo el estado vive en el `localStorage` de este
 * navegador. No hay servidor ni base de datos; sirve para validar la experiencia y
 * las reglas antes de decidir el backend real.
 */
const STORAGE_KEY = 'syntia:facturacion-mock:v2'

/** El historial solo crece; se conserva lo más reciente para no agotar el almacenamiento. */
const MAX_EVENTS = 500

const listeners = new Set<() => void>()
let cache: { raw: string | null; state: InvoicingState } = { raw: null, state: initialInvoicingState() }

function isInvoice(value: unknown): value is Invoice {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    (v.status === 'borrador' || v.status === 'definitiva') &&
    typeof v.invoiceNumber === 'string' &&
    typeof v.issueDate === 'string' &&
    typeof v.baseCents === 'number' &&
    typeof v.totalCents === 'number'
  )
}

/** Facturas guardadas antes de existir estos campos: se rellenan con sus valores por defecto. */
function withNewerFields(invoice: Invoice): Invoice {
  const stored = invoice as Partial<Invoice>
  return {
    ...invoice,
    lines: Array.isArray(stored.lines) && stored.lines.length > 0 ? stored.lines : linesFromLegacy(invoice),
    dateReason: typeof stored.dateReason === 'string' ? stored.dateReason : '',
    paymentMethod:
      stored.paymentMethod && PAYMENT_METHODS.includes(stored.paymentMethod) ? stored.paymentMethod : DEFAULT_PAYMENT_METHOD,
  }
}

function parseState(raw: string): InvoicingState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const value = parsed as Record<string, unknown>
    if (!Array.isArray(value.invoices) || !Array.isArray(value.parties) || !Array.isArray(value.events)) return null
    if (typeof value.issuer !== 'object' || value.issuer === null) return null

    return {
      invoices: value.invoices.filter(isInvoice).map(withNewerFields),
      parties: value.parties as InvoicingState['parties'],
      products: Array.isArray(value.products) ? (value.products as InvoicingState['products']) : [...SAMPLE_PRODUCTS],
      issuer: value.issuer as InvoicingState['issuer'],
      events: value.events as InvoicingState['events'],
    }
  } catch {
    return null
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Instantánea estable (misma referencia mientras no cambie lo guardado), como pide `useSyncExternalStore`. */
export function getInvoicingSnapshot(): InvoicingState {
  const raw = readRaw()
  if (raw === cache.raw) return cache.state

  cache = { raw, state: (raw !== null ? parseState(raw) : null) ?? initialInvoicingState() }
  return cache.state
}

const SERVER_SNAPSHOT: InvoicingState = initialInvoicingState()

export function getInvoicingServerSnapshot(): InvoicingState {
  return SERVER_SNAPSHOT
}

export function subscribeToInvoicing(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function persist(state: InvoicingState): void {
  const trimmed = state.events.length > MAX_EVENTS ? { ...state, events: state.events.slice(-MAX_EVENTS) } : state
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Sin almacenamiento (modo privado, cuota): la sesión sigue sin guardar.
  }
  for (const listener of listeners) listener()
}

function newId(): string {
  return `fac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Aplica una operación del dominio sobre el estado guardado y persiste el resultado.
 * Se guarda también cuando la operación se rechaza si dejó un apunte en el historial
 * (p. ej. un intento de modificar una factura expedida).
 */
export function runInvoicingOperation<R extends { state: InvoicingState }>(
  operation: (state: InvoicingState, context: OperationContext) => R
): R {
  const current = getInvoicingSnapshot()
  const result = operation(current, { now: new Date(), newId })
  if (result.state !== current) persist(result.state)
  return result
}

/** Borra lo guardado y vuelve a los datos de ejemplo. */
export function resetInvoicing(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que borrar.
  }
  for (const listener of listeners) listener()
}
