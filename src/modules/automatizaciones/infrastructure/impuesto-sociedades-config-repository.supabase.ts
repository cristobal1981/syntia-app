import type {
  ImpuestoSociedadesConfig,
  ImpuestoSociedadesConfigInput,
  TipoEmpresaKey,
} from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

type ConfigRow = {
  id: string
  anio: number
  tipo_empresa_key: TipoEmpresaKey
  es_escala: boolean
  tipo_gravamen_fijo: number | null
  base_gravamen: number | null
  tipo_gravamen_base: number | null
  tipo_gravamen_restante: number | null
  updated_at: string
}

const CONFIG_SELECT =
  'id, anio, tipo_empresa_key, es_escala, tipo_gravamen_fijo, base_gravamen, tipo_gravamen_base, tipo_gravamen_restante, updated_at'

function mapRow(row: ConfigRow): ImpuestoSociedadesConfig {
  return {
    id: row.id,
    anio: row.anio,
    tipoEmpresaKey: row.tipo_empresa_key,
    esEscala: row.es_escala,
    tipoGravamenFijo: row.tipo_gravamen_fijo,
    baseGravamen: row.base_gravamen,
    tipoGravamenBase: row.tipo_gravamen_base,
    tipoGravamenRestante: row.tipo_gravamen_restante,
    updatedAt: row.updated_at,
  }
}

function toInsertRow(input: ImpuestoSociedadesConfigInput) {
  return {
    anio: input.anio,
    tipo_empresa_key: input.tipoEmpresaKey,
    es_escala: input.esEscala,
    tipo_gravamen_fijo: input.tipoGravamenFijo,
    base_gravamen: input.baseGravamen,
    tipo_gravamen_base: input.tipoGravamenBase,
    tipo_gravamen_restante: input.tipoGravamenRestante,
    updated_at: new Date().toISOString(),
  }
}

export async function listImpuestoSociedadesConfigs(): Promise<
  ImpuestoSociedadesConfig[]
> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('config_impuesto_sociedades')
    .select(CONFIG_SELECT)
    .order('anio', { ascending: false })
    .order('tipo_empresa_key', { ascending: true })

  if (error) throw error
  return (data as ConfigRow[]).map(mapRow)
}

export async function insertImpuestoSociedadesConfig(
  input: ImpuestoSociedadesConfigInput
): Promise<ImpuestoSociedadesConfig> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('config_impuesto_sociedades')
    .insert(toInsertRow(input))
    .select(CONFIG_SELECT)
    .single()

  if (error) throw error
  return mapRow(data as ConfigRow)
}

export async function updateImpuestoSociedadesConfig(
  id: string,
  input: ImpuestoSociedadesConfigInput
): Promise<ImpuestoSociedadesConfig> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('config_impuesto_sociedades')
    .update(toInsertRow(input))
    .eq('id', id)
    .select(CONFIG_SELECT)
    .single()

  if (error) throw error
  return mapRow(data as ConfigRow)
}

export async function deleteImpuestoSociedadesConfig(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('config_impuesto_sociedades').delete().eq('id', id)
  if (error) throw error
}
