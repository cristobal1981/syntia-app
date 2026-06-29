import { unstable_cache } from 'next/cache'

import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { buildObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import type { ObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import { fetchClientProjectIds } from '@/src/modules/portal/infrastructure/odoo-client-projects'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import type { TramitesSnapshot } from '@/src/modules/tramites/domain/types'
import { fetchTramitesFromOdoo } from '@/src/modules/tramites/infrastructure/odoo-tramites-repository'

const CLIENT_ODOO_PARTNER_REVALIDATE_SECONDS = 300
const TRAMITES_SNAPSHOT_REVALIDATE_SECONDS = 30
const CLIENT_PROJECT_IDS_REVALIDATE_SECONDS = 30
const OBLIGACION_TASK_INDEX_REVALIDATE_SECONDS = 30
const TRAMITES_TAG_ID_REVALIDATE_SECONDS = 300

export function clientOdooPartnerCacheTag(actorId: string): string {
  return `client-odoo-partner:${actorId}`
}

export function tramitesSnapshotCacheTag(partnerId: number): string {
  return `tramites-snapshot:${partnerId}`
}

export function clientProjectIdsCacheTag(partnerId: number): string {
  return `client-project-ids:${partnerId}`
}

export function obligacionTaskIndexCacheTag(partnerId: number): string {
  return `obligacion-task-index:${partnerId}`
}

export function tramitesTagIdCacheTag(tagName: string): string {
  return `tramites-tag-id:${tagName}`
}

async function loadClientOdooPartnerId(actorId: string): Promise<number | null> {
  const integration = await getClientIntegrationByUserId(actorId)
  const partnerId = integration?.odoo_partner_id
  if (typeof partnerId === 'number' && partnerId > 0) {
    return partnerId
  }
  return null
}

export async function getCachedClientOdooPartnerId(
  actorId: string
): Promise<number | null> {
  const cached = unstable_cache(
    () => loadClientOdooPartnerId(actorId),
    ['client-odoo-partner', actorId],
    {
      revalidate: CLIENT_ODOO_PARTNER_REVALIDATE_SECONDS,
      tags: [clientOdooPartnerCacheTag(actorId)],
    }
  )

  return cached()
}

export async function getCachedClientProjectIds(
  partnerId: number
): Promise<number[]> {
  const cached = unstable_cache(
    () => fetchClientProjectIds(partnerId),
    ['client-project-ids', String(partnerId)],
    {
      revalidate: CLIENT_PROJECT_IDS_REVALIDATE_SECONDS,
      tags: [clientProjectIdsCacheTag(partnerId)],
    }
  )

  return cached()
}

async function loadObligacionTaskIndex(partnerId: number): Promise<ObligacionTaskIndex> {
  const projectIds = await getCachedClientProjectIds(partnerId)
  return buildObligacionTaskIndex(projectIds)
}

export async function getCachedObligacionTaskIndex(
  partnerId: number
): Promise<ObligacionTaskIndex> {
  const cached = unstable_cache(
    () => loadObligacionTaskIndex(partnerId),
    ['obligacion-task-index', String(partnerId)],
    {
      revalidate: OBLIGACION_TASK_INDEX_REVALIDATE_SECONDS,
      tags: [obligacionTaskIndexCacheTag(partnerId)],
    }
  )

  return cached()
}

async function loadTramitesTagId(tagName: string): Promise<number | null> {
  const rows = await odooSearchRead<{ id: number }>('project.tags', {
    domain: [['name', '=', tagName]],
    fields: ['id'],
    limit: 1,
  })

  return rows[0]?.id ?? null
}

export async function getCachedTramitesTagId(
  tagName: string
): Promise<number | null> {
  const cached = unstable_cache(
    () => loadTramitesTagId(tagName),
    ['tramites-tag-id', tagName],
    {
      revalidate: TRAMITES_TAG_ID_REVALIDATE_SECONDS,
      tags: [tramitesTagIdCacheTag(tagName)],
    }
  )

  return cached()
}

async function loadTramitesSnapshot(partnerId: number): Promise<TramitesSnapshot> {
  return fetchTramitesFromOdoo(partnerId)
}

export async function getCachedTramitesSnapshot(
  partnerId: number
): Promise<TramitesSnapshot> {
  const cached = unstable_cache(
    () => loadTramitesSnapshot(partnerId),
    ['tramites-snapshot', String(partnerId)],
    {
      revalidate: TRAMITES_SNAPSHOT_REVALIDATE_SECONDS,
      tags: [tramitesSnapshotCacheTag(partnerId)],
    }
  )

  return cached()
}
