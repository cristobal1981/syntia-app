import { createSign } from 'crypto'

import {
  getGoogleDrivePublicSubfolderNames,
  isGoogleDriveServiceAccountConfigured,
} from '@/src/modules/portal/infrastructure/google-drive-env'

let cachedAccessToken: { token: string; expiresAt: number } | null = null

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n')
}

async function fetchGoogleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKeyRaw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()

  if (!email || !privateKeyRaw) {
    throw new Error('GOOGLE_DRIVE_NOT_CONFIGURED')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url'
  )
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url')
  const unsigned = `${header}.${claim}`
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(normalizePrivateKey(privateKeyRaw), 'base64url')
  const jwt = `${unsigned}.${signature}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_AUTH_FAILED')
  }

  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!payload.access_token) {
    throw new Error('GOOGLE_DRIVE_AUTH_FAILED')
  }

  const expiresIn = payload.expires_in ?? 3600
  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000 - 60_000,
  }

  return payload.access_token
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token
  }
  return fetchGoogleAccessToken()
}

function normalizeFolderName(value: string): string {
  return value.trim().toLocaleLowerCase('es')
}

export async function findPublicDriveFolderId(
  parentFolderId: string
): Promise<string | undefined> {
  if (!isGoogleDriveServiceAccountConfigured()) {
    return undefined
  }

  const accessToken = await getGoogleAccessToken()
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
