import { unstable_cache } from 'next/cache'

import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import type { ObligacionNotificationSnapshot } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-notification-snapshot'
import { buildObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import type { ObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import { fetchPendingSignaturesFromOdoo } from '@/src/modules/firmas/infrastructure/odoo-sign-repository'
import type { PendingSignaturesSnapshot } from '@/src/modules/firmas/domain/types'
import { countAttachmentsByRecordIds } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  resolveOdooErrorCode,
  type OdooServiceErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { fetchClientProjectIds } from '@/src/modules/portal/infrastructure/odoo-client-projects'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import type { TramitesSnapshot } from '@/src/modules/tramites/domain/types'
import { fetchTramitesFromOdoo } from '@/src/modules/tramites/infrastructure/odoo-tramites-repository'
import {
  findUnreadChatterCandidatesForRecords,
  type ChatterReadStateBootstrap,
  type ChatterUnreadCandidate,
} from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { chatterReadStateKey } from '@/src/modules/portal/domain/portal-notifications-types'

const CLIENT_ODOO_PARTNER_REVALIDATE_SECONDS = 300
const TRAMITES_SNAPSHOT_REVALIDATE_SECONDS = 90
const CLIENT_PROJECT_IDS_REVALIDATE_SECONDS = 90
const OBLIGACION_TASK_INDEX_REVALIDATE_SECONDS = 90
const OBLIGACION_NOTIFICATION_SNAPSHOT_REVALIDATE_SECONDS = 90
const PENDING_SIGNATURES_SNAPSHOT_REVALIDATE_SECONDS = 90
const CHATTER_UNREAD_BATCH_REVALIDATE_SECONDS = 60
const TRAMITES_TAG_ID_REVALIDATE_SECONDS = 300

const EMPTY_TRAMITES_SNAPSHOT: TramitesSnapshot = {
  tasks: [],
  tickets: [],
  tagFilterActive: false,
}

const EMPTY_OBLIGACION_NOTIFICATION_SNAPSHOT: ObligacionNotificationSnapshot = {
  leaves: [],
}

const EMPTY_PENDING_SIGNATURES_SNAPSHOT: PendingSignaturesSnapshot = {
  requests: [],
}

export function clientOdooPartnerCacheTag(actorId: string): string {
  return `client-odoo-partner:${actorId}`
}

export function clientOdooCompanyCacheTag(actorId: string): string {
  return `client-odoo-company:${actorId}`
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

export function obligacionNotificationSnapshotCacheTag(partnerId: number): string {
  return `obligacion-notification-snapshot:${partnerId}`
}

export function pendingSignaturesSnapshotCacheTag(partnerId: number): string {
  return `pending-signatures-snapshot:${partnerId}`
}

export function chatterUnreadBatchCacheTag(partnerId: number): string {
  return `chatter-unread-batch:${partnerId}`
}

function buildChatterUnreadCacheKey(
  partnerId: number,
  groups: Array<{
    recordKind: PortalRecordKind
    records: Array<{ recordId: number }>
  }>,
  readState: Map<string, number>
): string {
  const groupParts = groups
    .map((group) => {
      const recordParts = group.records
        .map((record) => {
          const lastSeen =
            readState.get(
              chatterReadStateKey(group.recordKind, record.recordId)
            ) ?? 0
          return `${record.recordId}:${lastSeen}`
        })
        .sort()
        .join('.')
      return `${group.recordKind}:${recordParts}`
    })
    .sort()
    .join('|')

  return `${partnerId}:${groupParts}`
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

async function loadClientOdooCompanyId(actorId: string): Promise<number | null> {
  const integration = await getClientIntegrationByUserId(actorId)
  const companyId = integration?.odoo_company_id
  if (typeof companyId === 'number' && companyId > 0) {
    return companyId
  }
  return null
}

export async function getCachedClientOdooCompanyId(
  actorId: string
): Promise<number | null> {
  const cached = unstable_cache(
    () => loadClientOdooCompanyId(actorId),
    ['client-odoo-company', actorId],
    {
      revalidate: CLIENT_ODOO_PARTNER_REVALIDATE_SECONDS,
      tags: [clientOdooCompanyCacheTag(actorId)],
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

async function loadObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const index = await getCachedObligacionTaskIndex(partnerId)
  const leafIds = index.leaves.map((leaf) => leaf.id)

  if (!leafIds.length) {
    return { leaves: [] }
  }

  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    leafIds
  )

  return {
    leaves: index.leaves.map((leaf) => ({
      ...leaf,
      attachmentCount: attachmentCounts.get(leaf.id) ?? 0,
    })),
  }
}

export async function getCachedObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const cached = unstable_cache(
    () => loadObligacionNotificationSnapshot(partnerId),
    ['obligacion-notification-snapshot', String(partnerId)],
    {
      revalidate: OBLIGACION_NOTIFICATION_SNAPSHOT_REVALIDATE_SECONDS,
      tags: [obligacionNotificationSnapshotCacheTag(partnerId)],
    }
  )

  return cached()
}

async function loadPendingSignaturesSnapshot(
  partnerId: number
): Promise<PendingSignaturesSnapshot> {
  const requests = await fetchPendingSignaturesFromOdoo(partnerId)
  return { requests }
}

export async function getCachedPendingSignaturesSnapshot(
  partnerId: number
): Promise<PendingSignaturesSnapshot> {
  const cached = unstable_cache(
    () => loadPendingSignaturesSnapshot(partnerId),
    ['pending-signatures-snapshot', String(partnerId)],
    {
      revalidate: PENDING_SIGNATURES_SNAPSHOT_REVALIDATE_SECONDS,
      tags: [pendingSignaturesSnapshotCacheTag(partnerId)],
    }
  )

  return cached()
}

export type CachedOdooSnapshotResult<T> = {
  data: T
  odooError?: OdooServiceErrorCode
}

async function loadCachedSnapshotSafe<T>(
  loader: () => Promise<T>,
  fallback: T
): Promise<CachedOdooSnapshotResult<T>> {
  try {
    return { data: await loader() }
  } catch (error) {
    return {
      data: fallback,
      odooError: resolveOdooErrorCode(error),
    }
  }
}

export async function getCachedTramitesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<TramitesSnapshot>> {
  return loadCachedSnapshotSafe(
    () => getCachedTramitesSnapshot(partnerId),
    EMPTY_TRAMITES_SNAPSHOT
  )
}

export async function getCachedObligacionNotificationSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<ObligacionNotificationSnapshot>> {
  return loadCachedSnapshotSafe(
    () => getCachedObligacionNotificationSnapshot(partnerId),
    EMPTY_OBLIGACION_NOTIFICATION_SNAPSHOT
  )
}

export async function getCachedPendingSignaturesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<PendingSignaturesSnapshot>> {
  return loadCachedSnapshotSafe(
    () => getCachedPendingSignaturesSnapshot(partnerId),
    EMPTY_PENDING_SIGNATURES_SNAPSHOT
  )
}

/** Poll / server action: evita `unstable_cache` para reflejar novedades al instante. */
export async function getFreshTramitesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<TramitesSnapshot>> {
  return loadCachedSnapshotSafe(
    () => loadTramitesSnapshot(partnerId),
    EMPTY_TRAMITES_SNAPSHOT
  )
}

async function loadFreshObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const projectIds = await fetchClientProjectIds(partnerId)
  const index = await buildObligacionTaskIndex(projectIds)
  const leafIds = index.leaves.map((leaf) => leaf.id)

  if (!leafIds.length) {
    return { leaves: [] }
  }

  const attachmentCounts = await countAttachmentsByRecordIds(
    'project.task',
    leafIds
  )

  return {
    leaves: index.leaves.map((leaf) => ({
      ...leaf,
      attachmentCount: attachmentCounts.get(leaf.id) ?? 0,
    })),
  }
}

export async function getFreshObligacionNotificationSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<ObligacionNotificationSnapshot>> {
  return loadCachedSnapshotSafe(
    () => loadFreshObligacionNotificationSnapshot(partnerId),
    EMPTY_OBLIGACION_NOTIFICATION_SNAPSHOT
  )
}

export async function getFreshPendingSignaturesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<PendingSignaturesSnapshot>> {
  return loadCachedSnapshotSafe(
    () => loadPendingSignaturesSnapshot(partnerId),
    EMPTY_PENDING_SIGNATURES_SNAPSHOT
  )
}

export async function getFreshUnreadChatterCandidates(input: {
  partnerId: number
  groups: Array<{
    resModel: string
    recordKind: PortalRecordKind
    records: Array<{ recordId: number }>
  }>
  readState: Map<string, number>
  clientPartnerId: number
}): Promise<{
  unread: ChatterUnreadCandidate[]
  bootstrapUpdates: ChatterReadStateBootstrap[]
}> {
  if (!input.groups.length) {
    return { unread: [], bootstrapUpdates: [] }
  }

  return findUnreadChatterCandidatesForRecords({
    groups: input.groups,
    readState: input.readState,
    clientPartnerId: input.clientPartnerId,
  })
}

export async function getCachedUnreadChatterCandidates(input: {
  partnerId: number
  groups: Array<{
    resModel: string
    recordKind: PortalRecordKind
    records: Array<{ recordId: number }>
  }>
  readState: Map<string, number>
  clientPartnerId: number
}): Promise<{
  unread: ChatterUnreadCandidate[]
  bootstrapUpdates: ChatterReadStateBootstrap[]
}> {
  if (!input.groups.length) {
    return { unread: [], bootstrapUpdates: [] }
  }

  const cacheKey = buildChatterUnreadCacheKey(
    input.partnerId,
    input.groups,
    input.readState
  )

  const cached = unstable_cache(
    () =>
      findUnreadChatterCandidatesForRecords({
        groups: input.groups,
        readState: input.readState,
        clientPartnerId: input.clientPartnerId,
      }),
    ['chatter-unread-batch', cacheKey],
    {
      revalidate: CHATTER_UNREAD_BATCH_REVALIDATE_SECONDS,
      tags: [chatterUnreadBatchCacheTag(input.partnerId)],
    }
  )

  return cached()
}
