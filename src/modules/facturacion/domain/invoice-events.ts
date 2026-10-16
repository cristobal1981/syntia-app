export type InvoiceEventType =
  | 'creada'
  | 'modificada'
  | 'expedida'
  | 'rectificada'
  | 'eliminada'
  | 'cobro'
  | 'revision'
  | 'bloqueada'

/** Apunte del historial de actividad: solo se añaden, nunca se editan ni se borran. */
export type InvoiceEvent = {
  id: string
  /** Momento exacto (ISO). */
  at: string
  /** Factura afectada; `null` en eventos que no son de una factura. */
  invoiceId: string | null
  type: InvoiceEventType
  summary: string
}
