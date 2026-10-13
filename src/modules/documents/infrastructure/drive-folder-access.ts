import { authorizedDriveFetch } from '@/src/modules/documents/infrastructure/drive-http'
import {
  driveErrorFromResponse,
  readDriveJson,
} from '@/src/modules/documents/infrastructure/drive-errors'

const DRIVE_SHARED_QUERY_FLAGS = 'supportsAllDrives=true&includeItemsFromAllDrives=true'
const ACCESS_CACHE_TTL_MS = 60_000
// Metadatos de carpetas (nombre y padres) ya vistos: mismo TTL que la caché de
// acceso, así que un cambio del staff se nota en el mismo plazo que hasta ahora.
const NODE_CACHE_TTL_MS = 60_000
// Tope de entradas por instancia: la memoria no crece sin límite con muchos clientes.
const MAX_CACHE_ENTRIES = 5000
// El primer tramo de las migas se pinta siempre como «Inicio»: nunca se expone
// ni se pide a Drive el nombre real de la carpeta Pública.
const ROOT_CRUMB_NAME = 'Inicio'
// Un id de Drive solo contiene estos caracteres. Cualquier otra cosa es un
// intento de manipular la ruta o la consulta y se rechaza sin llamar a Drive.
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
// Tope de saltos hacia arriba: una Pública real no anida tanto. Acota las
// peticiones a Drive ante cadenas patológicas.
const MAX_TREE_DEPTH = 32

type AccessCacheEntry = {
  allowed: boolean
  expiresAt: number
}

const accessCache = new Map<string, AccessCacheEntry>()

type NodeCacheEntry = {
  id: string
  name?: string
  parents: string[]
  trashed: boolean
  expiresAt: number
}

const nodeCache = new Map<string, NodeCacheEntry>()

function setBounded<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key)
  if (map.size >= MAX_CACHE_ENTRIES) {
    // Se descartan las más antiguas (el Map conserva el orden de inserción).
    const drop = Math.ceil(MAX_CACHE_ENTRIES * 0.1)
    let removed = 0
    for (const oldest of map.keys()) {
      map.delete(oldest)
      removed += 1
      if (removed >= drop) break
    }
  }
  map.set(key, value)
}

// La clave incluye la raíz del cliente: la información de un cliente nunca se
// reutiliza para otro, ni siquiera dentro de la misma instancia.
function nodeKey(itemId: string, rootId: string): string {
  return `${rootId}|${itemId}`
}

type FetchedNode = {
  metadata: DriveParentsResponse
  /** Hasta cuándo es de fiar este metadato (límite para cualquier decisión derivada). */
  validUntil: number
}

function readNodeCache(itemId: string, rootId: string): FetchedNode | null {
  const key = nodeKey(itemId, rootId)
  const entry = nodeCache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    nodeCache.delete(key)
    return null
  }
  return {
    metadata: { id: entry.id, name: entry.name, parents: entry.parents, trashed: entry.trashed },
    validUntil: entry.expiresAt,
  }
}

function writeNodeCache(rootId: string, metadata: DriveParentsResponse): void {
  if (!metadata.id || !DRIVE_ID_PATTERN.test(metadata.id)) return
  setBounded(nodeCache, nodeKey(metadata.id, rootId), {
    id: metadata.id,
    name: metadata.name,
    parents: parentIdsOf(metadata),
    trashed: metadata.trashed === true,
    expiresAt: Date.now() + NODE_CACHE_TTL_MS,
  })
}

/**
 * Un listado ya trae id, nombre y padres de lo que contiene: se recuerdan para
 * que abrir una subcarpeta no vuelva a preguntar a Drive por su cadena de padres.
 * Solo se guarda lo que Drive devolvió con `parents` y sin papelera (la consulta
 * del listado excluye `trashed`).
 */
export function rememberListedDriveItems(
  rootId: string,
  items: Array<{ id?: string; name?: string; parents?: unknown }>
): void {
  for (const item of items) {
    if (!item.id || !Array.isArray(item.parents)) continue
    writeNodeCache(rootId, {
      id: item.id,
      name: item.name,
      parents: item.parents,
      trashed: false,
    })
  }
}

function cacheKey(itemId: string, rootId: string): string {
  return `${itemId}:${rootId}`
}

function readAccessCache(itemId: string, rootId: string): boolean | null {
  const entry = accessCache.get(cacheKey(itemId, rootId))
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    accessCache.delete(cacheKey(itemId, rootId))
    return null
  }
  return entry.allowed
}

/**
 * `validUntil` acota la decisión por los metadatos de los que sale: una
 * decisión nunca vive más que el dato más antiguo en que se apoya (las cachés
 * no se encadenan sumando sus plazos).
 */
function writeAccessCache(
  itemId: string,
  rootId: string,
  allowed: boolean,
  validUntil: number = Number.POSITIVE_INFINITY
): void {
  setBounded(accessCache, cacheKey(itemId, rootId), {
    allowed,
    expiresAt: Math.min(Date.now() + ACCESS_CACHE_TTL_MS, validUntil),
  })
}

type DriveParentsResponse = {
  id?: string
  parents?: unknown
  name?: string
  mimeType?: string
  trashed?: boolean
}

/** Solo ids con formato válido: una respuesta anómala de Drive nunca abre acceso. */
function parentIdsOf(metadata: DriveParentsResponse): string[] {
  if (!Array.isArray(metadata.parents)) return []
  return metadata.parents.filter(
    (parent): parent is string => typeof parent === 'string' && DRIVE_ID_PATTERN.test(parent)
  )
}

async function fetchDriveFileParents(fileId: string, rootId: string): Promise<FetchedNode> {
  const cached = readNodeCache(fileId, rootId)
  if (cached) return cached

  const response = await authorizedDriveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,parents,name,mimeType,trashed&${DRIVE_SHARED_QUERY_FLAGS}`
  )

  if (!response.ok) {
    throw await driveErrorFromResponse(response)
  }

  const metadata = (await readDriveJson(response)) as DriveParentsResponse
  // Un elemento en la papelera no se recuerda: el siguiente acceso lo vuelve a comprobar.
  if (metadata.trashed !== true) writeNodeCache(rootId, metadata)
  return { metadata, validUntil: Date.now() + NODE_CACHE_TTL_MS }
}

export async function assertDriveItemWithinClientTree(
  itemId: string,
  rootId: string
): Promise<void> {
  if (!DRIVE_ID_PATTERN.test(itemId ?? '') || !DRIVE_ID_PATTERN.test(rootId ?? '')) {
    throw new Error('DRIVE_ACCESS_FORBIDDEN')
  }

  if (itemId === rootId) {
    return
  }

  const cached = readAccessCache(itemId, rootId)
  if (cached === true) {
    return
  }
  if (cached === false) {
    throw new Error('DRIVE_ACCESS_FORBIDDEN')
  }

  const visited = new Set<string>()
  let currentId = itemId
  let validUntil = Number.POSITIVE_INFINITY

  while (true) {
    if (visited.has(currentId)) {
      writeAccessCache(itemId, rootId, false, validUntil)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }
    visited.add(currentId)

    if (visited.size > MAX_TREE_DEPTH) {
      writeAccessCache(itemId, rootId, false, validUntil)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }

    const node = await fetchDriveFileParents(currentId, rootId)
    const metadata = node.metadata
    validUntil = Math.min(validUntil, node.validUntil)
    // Un elemento (o una carpeta ancestra) en la papelera ya no es accesible.
    if (metadata.trashed === true) {
      throw new Error('DRIVE_ITEM_NOT_FOUND')
    }
    const parents = parentIdsOf(metadata)

    if (parents.includes(rootId)) {
      writeAccessCache(itemId, rootId, true, validUntil)
      return
    }

    if (!parents.length) {
      writeAccessCache(itemId, rootId, false, validUntil)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }

    currentId = parents[0]
    if (currentId === rootId) {
      writeAccessCache(itemId, rootId, true, validUntil)
      return
    }
  }
}

export async function buildDriveBreadcrumbs(
  folderId: string,
  rootId: string
): Promise<Array<{ id: string; name: string }>> {
  await assertDriveItemWithinClientTree(folderId, rootId)

  const crumbs: Array<{ id: string; name: string }> = []
  let currentId = folderId
  const visited = new Set<string>()

  while (true) {
    if (visited.has(currentId)) break
    visited.add(currentId)

    if (currentId === rootId) {
      crumbs.unshift({ id: rootId, name: ROOT_CRUMB_NAME })
      break
    }

    const { metadata } = await fetchDriveFileParents(currentId, rootId)
    if (!metadata.id || !metadata.name) break

    crumbs.unshift({ id: metadata.id, name: metadata.name })

    const parents = parentIdsOf(metadata)
    if (!parents.length) break
    // Con varios padres, subir siempre por el que lleva a la raíz del cliente:
    // las migas nunca deben revelar nombres por encima de la Pública.
    currentId = parents.includes(rootId) ? rootId : parents[0]
  }

  return crumbs
}
