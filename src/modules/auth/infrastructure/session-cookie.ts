import type {
  PortalRole,
  PortalSession,
  ViewAsPayload,
} from '@/src/modules/auth/domain/types'

const VALID_ROLES: ReadonlySet<string> = new Set<PortalRole>([
  'advisor',
  'admin',
  'client',
  'worker',
])

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

/**
 * Cookie de sesión = `payload.firma` (base64url + HMAC-SHA256). Usa solo Web
 * Crypto para poder correr también en el runtime edge (proxy).
 */
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
  // Exactamente `payload.firma`: segmentos de más no se toleran.
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
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
    if (!session?.user?.id || typeof session.user.id !== 'string') return null
    if (typeof session.expiresAt !== 'number' || !session.expiresAt) return null
    // La firma garantiza que lo escribimos nosotros, pero un rol fuera de la lista
    // (sesión antigua o versión distinta) no debe llegar a los guards como válido.
    if (typeof session.user.role !== 'string' || !VALID_ROLES.has(session.user.role)) return null
    if (Date.now() > session.expiresAt) return null

    return session
  } catch {
    return null
  }
}

export function getSessionSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET
  if (!secret) {
    throw new Error(
      'PORTAL_SESSION_SECRET no está configurada. Es obligatoria para firmar la cookie de sesión.'
    )
  }
  return secret
}

export async function getSessionFromToken(
  token: string | undefined
): Promise<PortalSession | null> {
  if (!token) return null
  return parseSessionToken(token, getSessionSecret())
}

async function signPayload(payload: unknown, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await importKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

export async function createViewAsToken(
  payload: ViewAsPayload,
  secret: string
): Promise<string> {
  // Prefijo de dominio: una cookie de sesión firmada con el mismo secreto no
  // puede reutilizarse como token de vista (ni al revés).
  return signPayload({ kind: 'view-as', ...payload }, secret)
}

export async function parseViewAsToken(
  token: string,
  secret: string
): Promise<ViewAsPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, signature] = parts
  if (!body || !signature) return null

  try {
    const key = await importKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(body)
    )
    if (!valid) return null

    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as
      | (Partial<ViewAsPayload> & { kind?: string })
      | null
    if (parsed?.kind !== 'view-as') return null
    if (typeof parsed.staffAuthId !== 'string' || !parsed.staffAuthId) return null
    if (typeof parsed.clientUserId !== 'string' || !parsed.clientUserId) return null
    if (typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) return null

    return {
      staffAuthId: parsed.staffAuthId,
      clientUserId: parsed.clientUserId,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export async function getViewAsFromToken(
  token: string | undefined
): Promise<ViewAsPayload | null> {
  if (!token) return null
  return parseViewAsToken(token, getSessionSecret())
}
