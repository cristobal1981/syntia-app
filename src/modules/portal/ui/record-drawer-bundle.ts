import type {
  PortalChatterMessage,
  RecordDrawerBundleResult,
} from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { dedupedServerAction } from '@/src/modules/portal/infrastructure/server-action-dedup'
import { fetchRecordDrawerBundle } from '@/src/modules/portal/ui/portal-read-api'

/**
 * Hasta cuándo se da por buena una conversación guardada sin preguntar nada a Odoo. Pasado ese
 * tiempo se enseña igualmente, al instante, y se pide solo lo posterior al último mensaje.
 */
export const DRAWER_BUNDLE_FRESH_MS = 30_000

/** Conversaciones guardadas a la vez; al pasarse se descarta la menos usada. */
export const DRAWER_BUNDLE_MAX_ENTRIES = 30

export type DrawerBundle = {
  messages: PortalChatterMessage[]
  hasMore: boolean
  /** `undefined` = aún no se ha pedido (p. ej. solo se guardó la conversación). */
  description?: string | null
  at: number
}

const cache = new Map<string, DrawerBundle>()
let cacheOwner: string | null = null
let prefetchInFlight = false

export function drawerBundleKey(kind: PortalRecordKind, recordId: number): string {
  return `${kind}:${recordId}`
}

export function isDrawerBundleFresh(entry: DrawerBundle, now = Date.now()): boolean {
  return now - entry.at < DRAWER_BUNDLE_FRESH_MS
}

/** Lo guardado de ese registro; leerlo lo marca como el más reciente. */
export function readDrawerBundle(
  kind: PortalRecordKind,
  recordId: number
): DrawerBundle | undefined {
  const key = drawerBundleKey(kind, recordId)
  const entry = cache.get(key)
  if (!entry) return undefined
  cache.delete(key)
  cache.set(key, entry)
  return entry
}

function storeDrawerBundle(key: string, entry: DrawerBundle) {
  cache.delete(key)
  cache.set(key, entry)
  while (cache.size > DRAWER_BUNDLE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function sameTail(a: PortalChatterMessage[], b: PortalChatterMessage[]): boolean {
  return a.length === b.length && a[a.length - 1]?.id === b[b.length - 1]?.id
}

/**
 * Guarda la conversación tal como está ahora (conserva la descripción ya conocida). Solo cuenta
 * como «recién comprobada» si ha cambiado (llegó o se envió un mensaje): volver a guardar lo mismo
 * no debe hacer pasar por fresco algo que nadie ha vuelto a preguntar a Odoo.
 */
export function writeDrawerMessages(
  kind: PortalRecordKind,
  recordId: number,
  input: { messages: PortalChatterMessage[]; hasMore: boolean },
  now = Date.now()
) {
  const key = drawerBundleKey(kind, recordId)
  const previous = cache.get(key)
  storeDrawerBundle(key, {
    messages: input.messages,
    hasMore: input.hasMore,
    ...(previous?.description !== undefined ? { description: previous.description } : {}),
    at: previous && sameTail(previous.messages, input.messages) ? previous.at : now,
  })
}

/** Se acaba de comprobar con Odoo que no hay nada posterior: vuelve a contar como fresco. */
export function touchDrawerBundle(kind: PortalRecordKind, recordId: number, now = Date.now()) {
  const key = drawerBundleKey(kind, recordId)
  const entry = cache.get(key)
  if (entry) storeDrawerBundle(key, { ...entry, at: now })
}

/**
 * Lo guardado es de una cuenta concreta: si cambia quien mira (otro cliente en la vista como
 * cliente, o un cierre de sesión), se vacía para no enseñar conversaciones ajenas.
 */
export function ensureDrawerBundleOwner(ownerId: string) {
  if (cacheOwner === ownerId) return
  cache.clear()
  cacheOwner = ownerId
}

export function clearDrawerBundleCache() {
  cache.clear()
  cacheOwner = null
}

/**
 * Mensajes y descripción de un registro con una sola petición. Las llamadas simultáneas al mismo
 * registro comparten la petición (el chat y la descripción piden lo mismo a la vez), y lo recibido
 * queda guardado.
 */
export function loadDrawerBundle(
  kind: PortalRecordKind,
  recordId: number
): Promise<RecordDrawerBundleResult> {
  const key = drawerBundleKey(kind, recordId)
  return dedupedServerAction(`drawerBundle:${key}`, async () => {
    const result = await fetchRecordDrawerBundle(kind, recordId)
    if (result.ok) {
      storeDrawerBundle(key, {
        messages: result.messages,
        hasMore: result.hasMore,
        description: result.description,
        at: Date.now(),
      })
    }
    return result
  })
}

/**
 * Calienta un registro antes de abrirlo (el ratón se detiene sobre su fila). No hace nada si ya
 * está fresco o si hay otra precarga en marcha: pasar el ratón por una lista no debe disparar
 * decenas de peticiones a Odoo.
 */
export function prefetchDrawerBundle(kind: PortalRecordKind, recordId: number) {
  if (prefetchInFlight) return
  const cached = cache.get(drawerBundleKey(kind, recordId))
  if (cached && cached.description !== undefined && isDrawerBundleFresh(cached)) return

  prefetchInFlight = true
  void loadDrawerBundle(kind, recordId)
    .catch(() => undefined)
    .finally(() => {
      prefetchInFlight = false
    })
}
