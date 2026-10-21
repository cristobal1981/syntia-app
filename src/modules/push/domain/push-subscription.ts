export type PushPreferences = {
  chatter: boolean
  status: boolean
  firmas: boolean
}

export const defaultPushPreferences: PushPreferences = {
  chatter: true,
  status: true,
  firmas: true,
}

export type PushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

const MAX_ENDPOINT_LENGTH = 2048
const MAX_KEY_LENGTH = 256
const MAX_USER_AGENT_LENGTH = 300
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/

/**
 * Valida lo que manda el navegador antes de guardarlo. El endpoint es una URL
 * https del servicio de push; las claves, base64url. Devuelve el valor limpio
 * o `null` si algo no cuadra.
 */
export function parsePushSubscriptionInput(
  input: unknown
): PushSubscriptionInput | null {
  if (typeof input !== 'object' || input === null) return null
  const { endpoint, p256dh, auth, userAgent } = input as Record<string, unknown>

  if (typeof endpoint !== 'string' || endpoint.length > MAX_ENDPOINT_LENGTH) {
    return null
  }
  try {
    if (new URL(endpoint).protocol !== 'https:') return null
  } catch {
    return null
  }

  for (const key of [p256dh, auth]) {
    if (
      typeof key !== 'string' ||
      key.length === 0 ||
      key.length > MAX_KEY_LENGTH ||
      !BASE64URL.test(key)
    ) {
      return null
    }
  }

  return {
    endpoint,
    p256dh: p256dh as string,
    auth: auth as string,
    userAgent:
      typeof userAgent === 'string'
        ? userAgent.slice(0, MAX_USER_AGENT_LENGTH)
        : undefined,
  }
}

export function parsePushPreferences(input: unknown): PushPreferences | null {
  if (typeof input !== 'object' || input === null) return null
  const { chatter, status, firmas } = input as Record<string, unknown>
  if (
    typeof chatter !== 'boolean' ||
    typeof status !== 'boolean' ||
    typeof firmas !== 'boolean'
  ) {
    return null
  }
  return { chatter, status, firmas }
}
