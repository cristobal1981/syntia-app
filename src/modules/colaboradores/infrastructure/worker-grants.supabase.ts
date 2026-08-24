import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { upsertClientIntegration } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import {
  WORKER_SECTION_HREFS,
  isWorkerSectionHref,
  type WorkerSectionHref,
} from '@/src/modules/colaboradores/domain/types'

export type WorkerGrantRow = {
  worker_user_id: string
  owner_user_id: string
  allowed_sections: string[]
  is_enabled: boolean
}

const WORKER_GRANT_SELECT =
  'worker_user_id, owner_user_id, allowed_sections, is_enabled'

export function sanitizeAllowedSections(
  sections: readonly string[]
): WorkerSectionHref[] {
  return WORKER_SECTION_HREFS.filter((href) => sections.includes(href))
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
  allowedSections: WorkerSectionHref[]
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

export function parseAllowedSections(value: unknown): WorkerSectionHref[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is WorkerSectionHref =>
      typeof item === 'string' && isWorkerSectionHref(item)
  )
}
