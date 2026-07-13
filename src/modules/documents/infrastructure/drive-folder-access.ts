import { getGoogleDriveAccessToken } from '@/src/modules/documents/infrastructure/google-drive-auth'

const DRIVE_SHARED_QUERY_FLAGS = 'supportsAllDrives=true&includeItemsFromAllDrives=true'
const ACCESS_CACHE_TTL_MS = 60_000

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
  parents?: string[]
  name?: string
  mimeType?: string
}

async function fetchDriveFileParents(fileId: string): Promise<DriveParentsResponse> {
  const accessToken = await getGoogleDriveAccessToken()
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,parents,name,mimeType&${DRIVE_SHARED_QUERY_FLAGS}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  )

  if (response.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  return (await response.json()) as DriveParentsResponse
}

export async function assertDriveItemWithinClientTree(
  itemId: string,
  rootId: string
): Promise<void> {
  if (!itemId || !rootId) {
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

    const metadata = await fetchDriveFileParents(currentId)
    const parents = metadata.parents ?? []

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

    const parents = metadata.parents ?? []
    if (!parents.length) break
    currentId = parents[0]
  }

  return crumbs
}
