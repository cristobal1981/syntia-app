import { mapDriveApiFileToItem } from '@/src/modules/documents/domain/classify-drive-item'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type { DriveBreadcrumb, DriveFolderListing, DriveItem } from '@/src/modules/documents/domain/types'
import { getGoogleDriveAccessToken } from '@/src/modules/documents/infrastructure/google-drive-auth'
import {
  assertDriveItemWithinClientTree,
  buildDriveBreadcrumbs,
} from '@/src/modules/documents/infrastructure/drive-folder-access'

const DRIVE_SHARED_QUERY_FLAGS = 'supportsAllDrives=true&includeItemsFromAllDrives=true'
const LIST_FIELDS =
  'nextPageToken,files(id,name,mimeType,modifiedTime,size,iconLink,thumbnailLink)'

type DriveListResponse = {
  files?: Array<{
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    size?: string
    iconLink?: string
    thumbnailLink?: string
  }>
  nextPageToken?: string
}

async function driveFetch(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getGoogleDriveAccessToken()
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

export async function listDriveFolder(
  parentId: string,
  rootId: string,
  pageToken?: string
): Promise<DriveFolderListing> {
  await assertDriveItemWithinClientTree(parentId, rootId)

  const query = encodeURIComponent(
    `'${parentId}' in parents and trashed=false`
  )
  const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
  const response = await driveFetch(
    `/files?q=${query}&fields=${encodeURIComponent(LIST_FIELDS)}&pageSize=100&orderBy=folder,name_natural&${DRIVE_SHARED_QUERY_FLAGS}${page}`
  )

  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as DriveListResponse
  const items: DriveItem[] = (payload.files ?? [])
    .filter((file): file is NonNullable<typeof file> & { id: string; name: string; mimeType: string } =>
      Boolean(file.id && file.name && file.mimeType)
    )
    .map((file) =>
      mapDriveApiFileToItem({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        size: file.size,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
      })
    )

  const breadcrumbs: DriveBreadcrumb[] = await buildDriveBreadcrumbs(parentId, rootId)

  return {
    items: sortDriveItems(items),
    breadcrumbs,
    currentFolderId: parentId,
    nextPageToken: payload.nextPageToken,
  }
}

export async function downloadDriveFile(fileId: string, rootId: string): Promise<{
  filename: string
  mimetype: string
  dataBase64: string
  size: number
}> {
  await assertDriveItemWithinClientTree(fileId, rootId)

  const metaResponse = await driveFetch(
    `/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size&${DRIVE_SHARED_QUERY_FLAGS}`
  )

  if (metaResponse.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }
  if (!metaResponse.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const metadata = (await metaResponse.json()) as {
    name?: string
    mimeType?: string
    size?: string
  }

  const googleWorkspaceExport = getGoogleExportMime(metadata.mimeType ?? '')
  let downloadResponse: Response

  if (googleWorkspaceExport) {
    downloadResponse = await driveFetch(
      `/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(googleWorkspaceExport.mime)}&${DRIVE_SHARED_QUERY_FLAGS}`
    )
  } else {
    downloadResponse = await driveFetch(
      `/files/${encodeURIComponent(fileId)}?alt=media&${DRIVE_SHARED_QUERY_FLAGS}`
    )
  }

  if (!downloadResponse.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const buffer = Buffer.from(await downloadResponse.arrayBuffer())
  const filename = googleWorkspaceExport
    ? ensureExtension(metadata.name ?? 'documento', googleWorkspaceExport.extension)
    : (metadata.name ?? 'documento')
  const mimetype = googleWorkspaceExport?.mime ?? metadata.mimeType ?? 'application/octet-stream'

  return {
    filename,
    mimetype,
    dataBase64: buffer.toString('base64'),
    size: metadata.size ? Number(metadata.size) : buffer.length,
  }
}

function getGoogleExportMime(
  mimeType: string
): { mime: string; extension: string } | null {
  switch (mimeType) {
    case 'application/vnd.google-apps.document':
      return {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      }
    case 'application/vnd.google-apps.spreadsheet':
      return {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      }
    case 'application/vnd.google-apps.presentation':
      return { mime: 'application/pdf', extension: 'pdf' }
    default:
      return null
  }
}

function ensureExtension(name: string, extension: string): string {
  if (name.toLowerCase().endsWith(`.${extension}`)) return name
  return `${name}.${extension}`
}

export async function createDriveFolder(
  parentId: string,
  name: string,
  rootId: string
): Promise<DriveItem> {
  await assertDriveItemWithinClientTree(parentId, rootId)

  const response = await driveFetch(`/files?${DRIVE_SHARED_QUERY_FLAGS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })

  if (response.status === 409) {
    throw new Error('DRIVE_NAME_CONFLICT')
  }
  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
  }

  if (!payload.id || !payload.name || !payload.mimeType) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  return mapDriveApiFileToItem({
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType,
    modifiedTime: payload.modifiedTime,
  })
}

export async function uploadDriveFile(
  parentId: string,
  file: { name: string; mimeType: string; buffer: Buffer },
  rootId: string
): Promise<DriveItem> {
  await assertDriveItemWithinClientTree(parentId, rootId)

  const metadata = JSON.stringify({
    name: file.name,
    parents: [parentId],
  })
  const boundary = `syntia_drive_${Date.now()}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const accessToken = await getGoogleDriveAccessToken()
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size&${DRIVE_SHARED_QUERY_FLAGS}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
      cache: 'no-store',
    }
  )

  if (response.status === 409) {
    throw new Error('DRIVE_NAME_CONFLICT')
  }
  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    size?: string
  }

  if (!payload.id || !payload.name || !payload.mimeType) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  return mapDriveApiFileToItem({
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType,
    modifiedTime: payload.modifiedTime,
    size: payload.size,
  })
}

export async function renameDriveItem(
  itemId: string,
  newName: string,
  rootId: string
): Promise<DriveItem> {
  await assertDriveItemWithinClientTree(itemId, rootId)

  const response = await driveFetch(
    `/files/${encodeURIComponent(itemId)}?fields=id,name,mimeType,modifiedTime,size&${DRIVE_SHARED_QUERY_FLAGS}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }
  )

  if (response.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }
  if (response.status === 409) {
    throw new Error('DRIVE_NAME_CONFLICT')
  }
  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    size?: string
  }

  if (!payload.id || !payload.name || !payload.mimeType) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  return mapDriveApiFileToItem({
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType,
    modifiedTime: payload.modifiedTime,
    size: payload.size,
  })
}

export async function deleteDriveItem(itemId: string, rootId: string): Promise<void> {
  await assertDriveItemWithinClientTree(itemId, rootId)

  const response = await driveFetch(
    `/files/${encodeURIComponent(itemId)}?${DRIVE_SHARED_QUERY_FLAGS}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    }
  )

  if (response.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }
  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }
}

export async function moveDriveItem(
  itemId: string,
  targetFolderId: string,
  sourceFolderId: string,
  rootId: string
): Promise<DriveItem> {
  await assertDriveItemWithinClientTree(itemId, rootId)
  await assertDriveItemWithinClientTree(targetFolderId, rootId)
  await assertDriveItemWithinClientTree(sourceFolderId, rootId)

  if (itemId === targetFolderId) {
    throw new Error('DRIVE_ACCESS_FORBIDDEN')
  }

  const metaResponse = await driveFetch(
    `/files/${encodeURIComponent(itemId)}?fields=id,name,mimeType,modifiedTime,size,parents&${DRIVE_SHARED_QUERY_FLAGS}`
  )

  if (metaResponse.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }
  if (!metaResponse.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const metadata = (await metaResponse.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    size?: string
    parents?: string[]
  }

  if (!metadata.parents?.includes(sourceFolderId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  const response = await driveFetch(
    `/files/${encodeURIComponent(itemId)}?addParents=${encodeURIComponent(targetFolderId)}&removeParents=${encodeURIComponent(sourceFolderId)}&fields=id,name,mimeType,modifiedTime,size&${DRIVE_SHARED_QUERY_FLAGS}`,
    { method: 'PATCH' }
  )

  if (response.status === 404) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }
  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as {
    id?: string
    name?: string
    mimeType?: string
    modifiedTime?: string
    size?: string
  }

  if (!payload.id || !payload.name || !payload.mimeType) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  return mapDriveApiFileToItem({
    id: payload.id,
    name: payload.name,
    mimeType: payload.mimeType,
    modifiedTime: payload.modifiedTime,
    size: payload.size,
  })
}
