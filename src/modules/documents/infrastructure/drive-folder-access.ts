import { authorizedDriveFetch } from '@/src/modules/documents/infrastructure/drive-http'
import {
  driveErrorFromResponse,
  readDriveJson,
} from '@/src/modules/documents/infrastructure/drive-errors'

const DRIVE_SHARED_QUERY_FLAGS = 'supportsAllDrives=true&includeItemsFromAllDrives=true'
const ACCESS_CACHE_TTL_MS = 60_000
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

function writeAccessCache(itemId: string, rootId: string, allowed: boolean): void {
  accessCache.set(cacheKey(itemId, rootId), {
    allowed,
    expiresAt: Date.now() + ACCESS_CACHE_TTL_MS,
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

async function fetchDriveFileParents(fileId: string): Promise<DriveParentsResponse> {
  const response = await authorizedDriveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,parents,name,mimeType,trashed&${DRIVE_SHARED_QUERY_FLAGS}`
  )

  if (!response.ok) {
    throw await driveErrorFromResponse(response)
  }

  return (await readDriveJson(response)) as DriveParentsResponse
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

  while (true) {
    if (visited.has(currentId)) {
      writeAccessCache(itemId, rootId, false)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }
    visited.add(currentId)

    if (visited.size > MAX_TREE_DEPTH) {
      writeAccessCache(itemId, rootId, false)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }

    const metadata = await fetchDriveFileParents(currentId)
    // Un elemento (o una carpeta ancestra) en la papelera ya no es accesible.
    if (metadata.trashed === true) {
      throw new Error('DRIVE_ITEM_NOT_FOUND')
    }
    const parents = parentIdsOf(metadata)

    if (parents.includes(rootId)) {
      writeAccessCache(itemId, rootId, true)
      return
    }

    if (!parents.length) {
      writeAccessCache(itemId, rootId, false)
      throw new Error('DRIVE_ACCESS_FORBIDDEN')
    }

    currentId = parents[0]
    if (currentId === rootId) {
      writeAccessCache(itemId, rootId, true)
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

    const metadata = await fetchDriveFileParents(currentId)
    if (!metadata.id || !metadata.name) break

    crumbs.unshift({ id: metadata.id, name: metadata.name })

    if (currentId === rootId) break

    const parents = parentIdsOf(metadata)
    if (!parents.length) break
    // Con varios padres, subir siempre por el que lleva a la raíz del cliente:
    // las migas nunca deben revelar nombres por encima de la Pública.
    currentId = parents.includes(rootId) ? rootId : parents[0]
  }

  return crumbs
}
