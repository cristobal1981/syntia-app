import { unstable_cache, updateTag } from 'next/cache'

import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import type { ObligacionNotificationSnapshot } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-notification-snapshot'
import { buildObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import type { ObligacionTaskIndex } from '@/src/modules/obligaciones/infrastructure/odoo-obligacion-task-index'
import {
  fetchPendingSignaturesFromOdoo,
  fetchSignatureHistoryFromOdoo,
} from '@/src/modules/firmas/infrastructure/odoo-sign-repository'
import type {
  PendingSignaturesSnapshot,
  SignatureHistorySnapshot,
} from '@/src/modules/firmas/domain/types'
import {
  resolveOdooErrorCode,
  type OdooServiceErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { fetchObligacionesFromOdoo } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-repository'
import type { ObligacionesSnapshot } from '@/src/modules/obligaciones/domain/types'
import { fetchClientProjectIds } from '@/src/modules/portal/infrastructure/odoo-client-projects'
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
const SIGNATURE_HISTORY_SNAPSHOT_REVALIDATE_SECONDS = 90
const CHATTER_UNREAD_BATCH_REVALIDATE_SECONDS = 60
const OBLIGACION_TREE_REVALIDATE_SECONDS = 90

/**
 * Cuándo se ejecutó por última vez, en este proceso, una carga REAL contra Odoo de cada snapshot
 * (`unstable_cache` no dice la edad de lo que devuelve). Sirve para que el primer sondeo tras
 * cargar una página reutilice lo que el render acaba de leer en vez de repetirlo. Si no consta
 * (otra instancia, arranque en frío) se considera que no hay nada reciente y se lee en fresco.
 */
type RecentSnapshotName = 'tramites' | 'obligaciones' | 'firmas'

const snapshotLoadedAt = new Map<string, number>()

function markSnapshotLoaded(name: RecentSnapshotName, partnerId: number, now = Date.now()) {
  snapshotLoadedAt.set(`${name}:${partnerId}`, now)
}

export function isSnapshotLoadedWithin(
  name: RecentSnapshotName,
  partnerId: number,
  maxAgeMs: number,
  now = Date.now()
): boolean {
  const loadedAt = snapshotLoadedAt.get(`${name}:${partnerId}`)
  return loadedAt !== undefined && now - loadedAt <= maxAgeMs
}

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

function clientOdooPartnerCacheTag(actorId: string): string {
  return `client-odoo-partner:${actorId}`
}

export function tramitesSnapshotCacheTag(partnerId: number): string {
  return `tramites-snapshot:${partnerId}`
}

function clientProjectIdsCacheTag(partnerId: number): string {
  return `client-project-ids:${partnerId}`
}

export function obligacionTaskIndexCacheTag(partnerId: number): string {
  return `obligacion-task-index:${partnerId}`
}

export function obligacionTreeCacheTag(partnerId: number): string {
  return `obligacion-tree:${partnerId}`
}

export function obligacionNotificationSnapshotCacheTag(partnerId: number): string {
  return `obligacion-notification-snapshot:${partnerId}`
}

export function pendingSignaturesSnapshotCacheTag(partnerId: number): string {
  return `pending-signatures-snapshot:${partnerId}`
}

function signatureHistorySnapshotCacheTag(partnerId: number): string {
  return `signature-history-snapshot:${partnerId}`
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
  const index = await buildObligacionTaskIndex(projectIds)
  markSnapshotLoaded('obligaciones', partnerId)
  return index
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

async function loadTramitesSnapshot(partnerId: number): Promise<TramitesSnapshot> {
  const snapshot = await fetchTramitesFromOdoo(partnerId)
  markSnapshotLoaded('tramites', partnerId)
  return snapshot
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

/**
 * Los documentos ya no generan avisos, así que el recuento de adjuntos de cada
 * obligación no se pide a Odoo (era una consulta de ~400 ms por visita). El campo
 * se conserva en 0 por el seguimiento guardado, que ya no lo lee para avisar.
 */
function withoutAttachmentCount<T extends object>(
  leaves: T[]
): Array<T & { attachmentCount: number }> {
  return leaves.map((leaf) => ({ ...leaf, attachmentCount: 0 }))
}

async function loadObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const index = await getCachedObligacionTaskIndex(partnerId)
  return { leaves: withoutAttachmentCount(index.leaves) }
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

/**
 * Árbol de obligaciones de la pantalla (años, periodos y hojas con su recuento
 * de adjuntos): son 5 consultas en serie a Odoo, así que se comparte entre
 * visitas con la misma caducidad que el resto de snapshots.
 */
export async function getCachedObligacionTree(partnerId: number): Promise<ObligacionesSnapshot> {
  const cached = unstable_cache(
    () => fetchObligacionesFromOdoo(partnerId),
    ['obligacion-tree', String(partnerId)],
    {
      revalidate: OBLIGACION_TREE_REVALIDATE_SECONDS,
      tags: [obligacionTreeCacheTag(partnerId)],
    }
  )

  return cached()
}

async function loadPendingSignaturesSnapshot(
  partnerId: number
): Promise<PendingSignaturesSnapshot> {
  const requests = await fetchPendingSignaturesFromOdoo(partnerId)
  markSnapshotLoaded('firmas', partnerId)
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

async function loadSignatureHistorySnapshot(
  partnerId: number
): Promise<SignatureHistorySnapshot> {
  const requests = await fetchSignatureHistoryFromOdoo(partnerId)
  return { requests }
}

export async function getCachedSignatureHistorySnapshot(
  partnerId: number
): Promise<SignatureHistorySnapshot> {
  const cached = unstable_cache(
    () => loadSignatureHistorySnapshot(partnerId),
    ['signature-history-snapshot', String(partnerId)],
    {
      revalidate: SIGNATURE_HISTORY_SNAPSHOT_REVALIDATE_SECONDS,
      tags: [signatureHistorySnapshotCacheTag(partnerId)],
    }
  )

  return cached()
}

export type CachedOdooSnapshotResult<T> = {
  data: T
  odooError?: OdooServiceErrorCode
  /** La lectura renovó la caché compartida (no solo se saltó): lo siguiente que la lea ya la encuentra al día. */
  cacheRefreshed?: boolean
}

/**
 * Expira ya esas cachés para releerlas al instante (`updateTag`, solo disponible en Server Actions;
 * fuera de una devuelve `false` y quien llama carga directo, como antes). Es la forma de que la
 * lectura «fresca» del sondeo deje la caché al día en vez de tirar su resultado: sin esto, el
 * sondeo pagaba la carga entera de Odoo y, justo después, la página la volvía a pagar en frío.
 */
function expireCacheTagsNow(tags: string[]): boolean {
  try {
    for (const tag of tags) updateTag(tag)
    return true
  } catch {
    return false
  }
}

async function refreshSnapshotCache<T>(input: {
  tags: string[]
  cachedLoader: () => Promise<T>
  directLoader: () => Promise<T>
  fallback: T
}): Promise<CachedOdooSnapshotResult<T>> {
  const refreshing = expireCacheTagsNow(input.tags)
  const result = await loadCachedSnapshotSafe(
    refreshing ? input.cachedLoader : input.directLoader,
    input.fallback
  )
  return refreshing && !result.odooError ? { ...result, cacheRefreshed: true } : result
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

/**
 * Poll / server action: refleja las novedades al instante y, de paso, deja la caché de la página al
 * día con lo que acaba de leer (ver `refreshSnapshotCache`).
 */
export async function getFreshTramitesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<TramitesSnapshot>> {
  return refreshSnapshotCache({
    tags: [tramitesSnapshotCacheTag(partnerId)],
    cachedLoader: () => getCachedTramitesSnapshot(partnerId),
    directLoader: () => loadTramitesSnapshot(partnerId),
    fallback: EMPTY_TRAMITES_SNAPSHOT,
  })
}

async function loadFreshObligacionNotificationSnapshot(
  partnerId: number
): Promise<ObligacionNotificationSnapshot> {
  const projectIds = await fetchClientProjectIds(partnerId)
  const index = await buildObligacionTaskIndex(projectIds)
  markSnapshotLoaded('obligaciones', partnerId)
  return { leaves: withoutAttachmentCount(index.leaves) }
}

export async function getFreshObligacionNotificationSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<ObligacionNotificationSnapshot>> {
  return refreshSnapshotCache({
    // El snapshot sale del índice de tareas, y este de los proyectos del cliente: los tres, al día.
    tags: [
      clientProjectIdsCacheTag(partnerId),
      obligacionTaskIndexCacheTag(partnerId),
      obligacionNotificationSnapshotCacheTag(partnerId),
    ],
    cachedLoader: () => getCachedObligacionNotificationSnapshot(partnerId),
    directLoader: () => loadFreshObligacionNotificationSnapshot(partnerId),
    fallback: EMPTY_OBLIGACION_NOTIFICATION_SNAPSHOT,
  })
}

export async function getFreshPendingSignaturesSnapshotSafe(
  partnerId: number
): Promise<CachedOdooSnapshotResult<PendingSignaturesSnapshot>> {
  return refreshSnapshotCache({
    tags: [pendingSignaturesSnapshotCacheTag(partnerId)],
    cachedLoader: () => getCachedPendingSignaturesSnapshot(partnerId),
    directLoader: () => loadPendingSignaturesSnapshot(partnerId),
    fallback: EMPTY_PENDING_SIGNATURES_SNAPSHOT,
  })
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
