import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type {
  LeadCodigoCuota,
  LeadEstado,
  LeadRecord,
  LeadResidencia,
  LeadTipo,
} from '@/src/modules/leads/domain/types'

export type LeadRow = {
  id: string
  odoo_partner_id: number | null
  nombre: string | null
  email: string | null
  telefono: string | null
  tipo: string | null
  residencia: string | null
  facturacion_estimada: number | null
  codigo_cuota: string | null
  total_mensual: number | null
  estado: string
  motivo: string | null
  created_at: string
}

export const LEAD_SELECT =
  'id, odoo_partner_id, nombre, email, telefono, tipo, residencia, facturacion_estimada, codigo_cuota, total_mensual, estado, motivo, created_at'

const LEAD_TIPOS: readonly string[] = ['ALTA', 'CAMBIO']
const LEAD_RESIDENCIAS: readonly string[] = ['Canarias', 'Peninsula']
const LEAD_CODIGOS_CUOTA: readonly string[] = ['TRAMO_30', 'TRAMO_50', 'TRAMO_90']
const LEAD_ESTADOS_DB: readonly string[] = ['pendiente', 'aceptado', 'rechazado', 'no_interesa']

function parseEnum<T extends string>(value: string | null, allowed: readonly string[]): T | null {
  return value != null && allowed.includes(value) ? (value as T) : null
}

export function mapLeadRow(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    odooPartnerId: row.odoo_partner_id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    tipo: parseEnum<LeadTipo>(row.tipo, LEAD_TIPOS),
    residencia: parseEnum<LeadResidencia>(row.residencia, LEAD_RESIDENCIAS),
    facturacionEstimada: row.facturacion_estimada,
    codigoCuota: parseEnum<LeadCodigoCuota>(row.codigo_cuota, LEAD_CODIGOS_CUOTA),
    totalMensual: row.total_mensual,
    estado: (parseEnum<LeadEstado>(row.estado, LEAD_ESTADOS_DB) ?? 'pendiente') as LeadEstado,
    motivo: row.motivo,
    createdAt: row.created_at,
  }
}

export async function listLeads(): Promise<LeadRecord[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('landing_autonomo_leads')
    .select(LEAD_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as LeadRow[]).map(mapLeadRow)
}

export async function getLeadById(id: string): Promise<LeadRecord | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('landing_autonomo_leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapLeadRow(data as LeadRow) : null
}
