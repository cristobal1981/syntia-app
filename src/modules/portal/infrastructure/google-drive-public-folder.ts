import {
  getGoogleDrivePublicSubfolderNames,
  isGoogleDriveServiceAccountConfigured,
} from '@/src/modules/portal/infrastructure/google-drive-env'
import { getGoogleDriveAccessToken } from '@/src/modules/documents/infrastructure/google-drive-auth'

function normalizeFolderName(value: string): string {
  return value.trim().toLocaleLowerCase('es')
}

export async function findPublicDriveFolderId(
  parentFolderId: string
): Promise<string | undefined> {
  if (!isGoogleDriveServiceAccountConfigured()) {
    return undefined
  }

  const accessToken = await getGoogleDriveAccessToken()
  const query = encodeURIComponent(
    `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_REQUEST_FAILED')
  }

  const payload = (await response.json()) as {
    files?: Array<{ id?: string; name?: string }>
  }
  const acceptedNames = new Set(
    getGoogleDrivePublicSubfolderNames().map(normalizeFolderName)
  )

  for (const file of payload.files ?? []) {
    if (!file.id || !file.name) continue
    if (acceptedNames.has(normalizeFolderName(file.name))) {
      return file.id
    }
  }

  return undefined
}

export async function resolvePublicDriveFolderMap(
  parentFolderIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(parentFolderIds.filter(Boolean))]
  const entries = await Promise.all(
    uniqueIds.map(async (parentId) => {
      try {
        const publicId = await findPublicDriveFolderId(parentId)
        return publicId ? ([parentId, publicId] as const) : null
      } catch {
        return null
      }
    })
  )

  return new Map(entries.filter((entry): entry is [string, string] => entry !== null))
}
