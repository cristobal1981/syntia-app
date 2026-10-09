import { randomUUID } from 'crypto'

import { mapDriveApiFileToItem } from '@/src/modules/documents/domain/classify-drive-item'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type {
  DriveBreadcrumb,
  DriveDuplicate,
  DriveFolderListing,
  DriveItem,
} from '@/src/modules/documents/domain/types'
import {
  DRIVE_TRANSFER_TIMEOUT_MS,
  driveErrorFromResponse,
  readDriveBytes,
  readDriveJson,
} from '@/src/modules/documents/infrastructure/drive-errors'
import { authorizedDriveFetch } from '@/src/modules/documents/infrastructure/drive-http'
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

function driveFetch(path: string, init?: RequestInit, timeoutMs?: number): Promise<Response> {
  return authorizedDriveFetch(`https://www.googleapis.com/drive/v3${path}`, init, timeoutMs)
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
    throw await driveErrorFromResponse(response)
  }

  const payload = (await readDriveJson(response)) as DriveListResponse
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

export async function downloadDriveFile(
  fileId: string,
  rootId: string,
  options?: { maxBytes?: number }
): Promise<{
  filename: string
  mimetype: string
  dataBase64: string
  size: number
}> {
  await assertDriveItemWithinClientTree(fileId, rootId)

  const metaResponse = await driveFetch(
    `/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size&${DRIVE_SHARED_QUERY_FLAGS}`
  )
  if (!metaResponse.ok) {
    throw await driveErrorFromResponse(metaResponse)
  }

  const metadata = (await readDriveJson(metaResponse)) as {
    name?: string
    mimeType?: string
    size?: string
  }

  // Se comprueba el tamaño ANTES de bajar el contenido (los archivos nativos de
  // Google no declaran tamaño; para esos solo se puede comprobar al exportar).
  if (options?.maxBytes !== undefined && Number(metadata.size) > options.maxBytes) {
    throw new Error('DRIVE_FILE_TOO_LARGE')
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
    throw await driveErrorFromResponse(downloadResponse)
  }

  const buffer = await readDriveBytes(downloadResponse)
  // Los archivos nativos de Google no declaran tamaño: se comprueba también aquí.
  if (options?.maxBytes !== undefined && buffer.length > options.maxBytes) {
    throw new Error('DRIVE_FILE_TOO_LARGE')
  }
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
  const boundary = `syntia_drive_${randomUUID()}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(metadata),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const response = await authorizedDriveFetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size&${DRIVE_SHARED_QUERY_FLAGS}`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
    DRIVE_TRANSFER_TIMEOUT_MS
  )

  if (!response.ok) {
    throw await driveErrorFromResponse(response)
  }

  const payload = (await readDriveJson(response)) as {
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

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const SCAN_PARENTS_PER_QUERY = 20
const SCAN_MAX_DEPTH = 12
const SCAN_MAX_FOLDERS = 1000

function comparableName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase()
}

type ScanFile = { id?: string; name?: string; mimeType?: string; parents?: unknown }

/**
 * Busca, desde `parentId` y hacia abajo por TODA la jerarquía, un archivo cuyo
 * nombre coincida (sin distinguir mayúsculas/acentos compuestos) con alguno de
 * `names`. También detecta nombres repetidos dentro de la propia selección.
 * Solo lee. Si el árbol es demasiado grande para comprobarlo entero, falla
 * (cerrado) en vez de dar por buena una comprobación incompleta.
 */
export async function findDuplicateInSubtree(
  parentId: string,
  names: string[],
  rootId: string
): Promise<DriveDuplicate | null> {
  await assertDriveItemWithinClientTree(parentId, rootId)

  const crumbs = await buildDriveBreadcrumbs(parentId, rootId)
  // Sin la carpeta raíz del cliente: su nombre real no se muestra.
  const basePath = crumbs.filter((crumb) => crumb.id !== rootId).map((crumb) => crumb.name)

  const wanted = new Set<string>()
  for (const name of names) {
    const key = comparableName(name)
    if (wanted.has(key)) {
      return { name, folders: basePath, inSelection: true }
    }
    wanted.add(key)
  }

  let level: Array<{ id: string; path: string[] }> = [{ id: parentId, path: basePath }]
  let scanned = 0

  for (let depth = 0; level.length > 0; depth += 1) {
    scanned += level.length
    if (depth > SCAN_MAX_DEPTH || scanned > SCAN_MAX_FOLDERS) {
      throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
    }

    const next: Array<{ id: string; path: string[] }> = []

    for (let start = 0; start < level.length; start += SCAN_PARENTS_PER_QUERY) {
      const chunk = level.slice(start, start + SCAN_PARENTS_PER_QUERY)
      const pathById = new Map(chunk.map((folder) => [folder.id, folder.path]))
      const query = `(${chunk.map((folder) => `'${folder.id}' in parents`).join(' or ')}) and trashed=false`
      let pageToken: string | undefined

      do {
        const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        const response = await driveFetch(
          `/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('nextPageToken,files(id,name,mimeType,parents)')}&pageSize=1000&${DRIVE_SHARED_QUERY_FLAGS}${page}`
        )
        if (!response.ok) {
          throw await driveErrorFromResponse(response)
        }
        const payload = (await readDriveJson(response)) as { files?: ScanFile[]; nextPageToken?: string }

        for (const file of payload.files ?? []) {
          if (typeof file.name !== 'string' || typeof file.id !== 'string') continue
          const parents = Array.isArray(file.parents) ? file.parents : []
          const containing = parents.find(
            (parent): parent is string => typeof parent === 'string' && pathById.has(parent)
          )
          if (!containing) continue
          const path = pathById.get(containing) ?? basePath

          if (file.mimeType === FOLDER_MIME) {
            if (DRIVE_ID_PATTERN.test(file.id)) next.push({ id: file.id, path: [...path, file.name] })
          } else if (wanted.has(comparableName(file.name))) {
            return { name: file.name, folders: path }
          }
        }
        pageToken = payload.nextPageToken
      } while (pageToken)
    }

    level = next
  }

  return null
}
