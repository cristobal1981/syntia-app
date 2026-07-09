import { createSign } from 'crypto'

import { isGoogleDriveServiceAccountConfigured } from '@/src/modules/portal/infrastructure/google-drive-env'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

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
      scope: DRIVE_SCOPE,
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

export async function getGoogleDriveAccessToken(): Promise<string> {
  if (!isGoogleDriveServiceAccountConfigured()) {
    throw new Error('GOOGLE_DRIVE_NOT_CONFIGURED')
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token
  }

  return fetchGoogleAccessToken()
}

export function isGoogleDriveApiConfigured(): boolean {
  return isGoogleDriveServiceAccountConfigured()
}
