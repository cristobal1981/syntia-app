export type LeadEstado = 'pendiente' | 'aceptado' | 'rechazado' | 'no_interesa'
export type LeadTipo = 'ALTA' | 'CAMBIO'
export type LeadResidencia = 'Canarias' | 'Peninsula'
export type LeadCodigoCuota = 'TRAMO_30' | 'TRAMO_50' | 'TRAMO_90'

export type LeadRecord = {
  id: string
  odooPartnerId: number | null
  nombre: string | null
  email: string | null
  telefono: string | null
  tipo: LeadTipo | null
  residencia: LeadResidencia | null
  facturacionEstimada: number | null
  codigoCuota: LeadCodigoCuota | null
  totalMensual: number | null
  estado: LeadEstado
  motivo: string | null
  createdAt: string
}

export type FacturacionBucketId =
  | 'lt_9600'
  | 'from_9600_to_12600'
  | 'from_12600_to_17000'
  | 'from_17000_to_50000'
  | 'gte_50000'

export type FacturacionBucket = {
  id: FacturacionBucketId
  min: number
  /** `null` = sin límite superior. */
  max: number | null
}

/**
 * Cortes redondos y explicables, NO alineados con los tramos de cuota reales
 * (facturación ≠ rendimiento neto, no tenemos el margen que usa el
 * simulador) — sirven para leer el patrón "a más facturación, ¿más
 * abandono?", no como una réplica exacta de TRAMO_30/50/90. Las etiquetas
 * viven en `content/leads.ts` (`leads.segments.facturacionBuckets`), no aquí.
 */
export const FACTURACION_BUCKETS: FacturacionBucket[] = [
  { id: 'lt_9600', min: -Infinity, max: 9_600 },
  { id: 'from_9600_to_12600', min: 9_600, max: 12_600 },
  { id: 'from_12600_to_17000', min: 12_600, max: 17_000 },
  { id: 'from_17000_to_50000', min: 17_000, max: 50_000 },
  { id: 'gte_50000', min: 50_000, max: null },
]

/** `null` — el corte por defecto es `[min, max)`, el último bucket no tiene tope. */
export function bucketFacturacion(value: number | null): FacturacionBucketId | null {
  if (value == null || !Number.isFinite(value)) return null
  const bucket = FACTURACION_BUCKETS.find(
    (candidate) => value >= candidate.min && (candidate.max == null || value < candidate.max)
  )
  return bucket?.id ?? null
}

export type FunnelEntry = {
  estado: LeadEstado
  count: number
  pct: number
}

export type ConvertedAnywayEntry = {
  estado: LeadEstado
  totalLeads: number
  convertedCount: number
  convertedPct: number
}

export type SegmentKey<T extends string> = T | 'sin_dato'

export type SegmentBreakdown<T extends string> = {
  key: SegmentKey<T>
  totalLeads: number
  convertedCount: number
  conversionRatePct: number
}

export type LeadMotivoEntry = {
  id: string
  nombre: string | null
  email: string | null
  estado: LeadEstado
  motivo: string
  createdAt: string
}

export type LeadTrendPoint = {
  /** `YYYY-MM-DD` */
  periodKey: string
  count: number
}

export type LeadContactCandidate = {
  id: string
  nombre: string | null
  email: string
  estado: LeadEstado
  totalMensual: number | null
  motivo: string | null
  lastContactedAt: string | null
}

export type LeadReport = {
  totalLeads: number
  funnel: FunnelEntry[]
  convertedAnywayByEstado: ConvertedAnywayEntry[]
  byTipo: SegmentBreakdown<LeadTipo>[]
  byResidencia: SegmentBreakdown<LeadResidencia>[]
  byCodigoCuota: SegmentBreakdown<LeadCodigoCuota>[]
  byFacturacionBucket: SegmentBreakdown<FacturacionBucketId>[]
  lostAnnualValue: number
  lostAnnualValueByEstado: { estado: LeadEstado; amount: number }[]
  motivos: LeadMotivoEntry[]
  trend: LeadTrendPoint[]
  contactCandidates: LeadContactCandidate[]
}

export const LEAD_ESTADOS: LeadEstado[] = ['pendiente', 'aceptado', 'rechazado', 'no_interesa']
