import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { upsertClientIntegration } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import {
  WORKER_SECTION_HREFS,
  WORKER_SECTIONS_WITH_WRITE,
  isWorkerAccessLevel,
  isWorkerSectionHref,
  type WorkerSectionGrants,
} from '@/src/modules/colaboradores/domain/types'

export type WorkerGrantRow = {
  worker_user_id: string
  owner_user_id: string
  allowed_sections: WorkerSectionGrants
  is_enabled: boolean
}

const WORKER_GRANT_SELECT =
  'worker_user_id, owner_user_id, allowed_sections, is_enabled'

/**
 * Filtra a hrefs conocidos y niveles conocidos; `/firmas` y `/guias` no
 * tienen mutación propia en el portal, así que un 'write' que llegue para
 * ellas se degrada a 'read' (defensa en profundidad — la UI no debe
 * ofrecer esa opción, pero esto no confía en que la UI sea la única entrada).
 */
export function sanitizeAllowedSections(
  sections: WorkerSectionGrants
): WorkerSectionGrants {
  const result: WorkerSectionGrants = {}
  for (const href of WORKER_SECTION_HREFS) {
    const level = sections[href]
    if (!isWorkerAccessLevel(level)) continue
    const canWrite = (WORKER_SECTIONS_WITH_WRITE as readonly string[]).includes(href)
    result[href] = level === 'write' && !canWrite ? 'read' : level
  }
  return result
}

export async function getWorkerGrant(
  workerUserId: string
): Promise<WorkerGrantRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('worker_grants')
    .select(WORKER_GRANT_SELECT)
    .eq('worker_user_id', workerUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as WorkerGrantRow | null) ?? null
}

export async function listWorkerGrantsForOwner(
  ownerUserId: string
): Promise<WorkerGrantRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('worker_grants')
    .select(WORKER_GRANT_SELECT)
    .eq('owner_user_id', ownerUserId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkerGrantRow[]
}

export async function upsertWorkerGrant(input: {
  workerUserId: string
  ownerUserId: string
  allowedSections: WorkerSectionGrants
  isEnabled: boolean
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('worker_grants').upsert(
    {
      worker_user_id: input.workerUserId,
      owner_user_id: input.ownerUserId,
      allowed_sections: input.allowedSections,
      is_enabled: input.isEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'worker_user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteWorkerGrant(workerUserId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('worker_grants')
    .delete()
    .eq('worker_user_id', workerUserId)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * El colaborador reutiliza el partner/carpeta del titular en su propia fila
 * de client_integrations (ver decisión de arquitectura: cero llamadas nuevas
 * a Odoo). Si el titular cambia de partner u carpeta, hay que repropagarlo o
 * los colaboradores quedan mirando datos desactualizados en silencio.
 */
export async function propagateOwnerIntegrationToWorkers(
  ownerUserId: string,
  fields: { odoo_partner_id: number | null; drive_folder_id: string | null }
): Promise<void> {
  const grants = await listWorkerGrantsForOwner(ownerUserId)
  await Promise.all(
    grants.map((grant) =>
      upsertClientIntegration(grant.worker_user_id, fields)
    )
  )
}

/**
 * Acepta tanto el shape legacy (array de hrefs, acceso completo implícito)
 * como el shape actual (objeto href→nivel), para columnas leídas en crudo
 * (p. ej. JSON sin pasar por el cliente de Supabase) que aún no hayan
 * pasado por el backfill de `colaboradores-schema.sql`.
 */
export function parseAllowedSections(value: unknown): WorkerSectionGrants {
  if (Array.isArray(value)) {
    const legacy: WorkerSectionGrants = {}
    for (const item of value) {
      if (typeof item === 'string' && isWorkerSectionHref(item)) {
        legacy[item] = 'write'
      }
    }
    return sanitizeAllowedSections(legacy)
  }

  if (value && typeof value === 'object') {
    return sanitizeAllowedSections(value as WorkerSectionGrants)
  }

  return {}
}
