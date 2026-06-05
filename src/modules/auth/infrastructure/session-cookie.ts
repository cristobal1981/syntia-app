import type { PortalSession } from '@/src/modules/auth/domain/types'

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(
  session: PortalSession,
  secret: string
): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)))
  const key = await importKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function parseSessionToken(
  token: string,
  secret: string
): Promise<PortalSession | null> {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  try {
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(payload)
    )
    if (!valid) return null

    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as PortalSession
    if (!session?.user?.id || !session.expiresAt) return null
    if (Date.now() > session.expiresAt) return null

    return session
  } catch {
    return null
  }
}

export function getSessionSecret(): string {
  return process.env.PORTAL_SESSION_SECRET || 'syntia-dev-session-secret'
}

export async function getSessionFromToken(
  token: string | undefined
): Promise<PortalSession | null> {
  if (!token) return null
  return parseSessionToken(token, getSessionSecret())
}
