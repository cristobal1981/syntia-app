/**
 * Errores de Drive tipados. El `message` es siempre uno de estos códigos (las
 * capas superiores los traducen con `switch (error.message)`), y `status` /
 * `reason` viajan aparte para poder registrarlos sin exponerlos al cliente.
 */
export type DriveFailureCode =
  | 'DRIVE_ITEM_NOT_FOUND'
  | 'DRIVE_ACCESS_FORBIDDEN'
  | 'DRIVE_NAME_CONFLICT'
  | 'DRIVE_RATE_LIMITED'
  | 'DRIVE_TIMEOUT'
  | 'DRIVE_STORAGE_FULL'
  | 'DRIVE_FILE_TOO_LARGE'
  | 'DRIVE_NOT_DOWNLOADABLE'
  | 'GOOGLE_DRIVE_AUTH_FAILED'
  | 'GOOGLE_DRIVE_REQUEST_FAILED'

export class DriveApiError extends Error {
  readonly code: DriveFailureCode
  readonly status?: number
  readonly reason?: string

  constructor(code: DriveFailureCode, status?: number, reason?: string) {
    super(code)
    this.name = 'DriveApiError'
    this.code = code
    this.status = status
    this.reason = reason
  }
}

export const DRIVE_REQUEST_TIMEOUT_MS = 20_000
export const DRIVE_TRANSFER_TIMEOUT_MS = 60_000

const RATE_LIMIT_REASONS = new Set([
  'ratelimitexceeded',
  'userratelimitexceeded',
  'sharingratelimitexceeded',
  'dailylimitexceeded',
  'quotaexceeded',
])
const STORAGE_REASONS = new Set(['storagequotaexceeded', 'teamdrivefilelimitexceeded'])
const TOO_LARGE_REASONS = new Set(['exportsizelimitexceeded', 'filesizelimitexceeded'])
const NOT_DOWNLOADABLE_REASONS = new Set([
  'filenotdownloadable',
  'cannotdownloadfile',
  'cannotdownloadabusivefile',
])

function isAbortLike(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

/** `fetch` con tope de tiempo: una Drive colgada nunca deja la acción esperando para siempre. */
export async function driveHttpFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number = DRIVE_REQUEST_TIMEOUT_MS
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new DriveApiError(isAbortLike(error) ? 'DRIVE_TIMEOUT' : 'GOOGLE_DRIVE_REQUEST_FAILED')
  }
}

async function readReason(response: Response): Promise<string | undefined> {
  try {
    const body = JSON.parse(await response.text()) as {
      error?: { errors?: Array<{ reason?: unknown }>; status?: unknown }
    }
    const reason = body.error?.errors?.[0]?.reason ?? body.error?.status
    return typeof reason === 'string' ? reason.slice(0, 80) : undefined
  } catch {
    return undefined
  }
}

/** Traduce una respuesta HTTP de Drive que no es 2xx al error tipado correspondiente. */
export async function driveErrorFromResponse(response: Response): Promise<DriveApiError> {
  const status = response.status
  const reason = await readReason(response)
  const key = reason?.toLowerCase().replace(/[^a-z]/g, '') ?? ''

  if (status === 404) return new DriveApiError('DRIVE_ITEM_NOT_FOUND', status, reason)
  if (status === 409) return new DriveApiError('DRIVE_NAME_CONFLICT', status, reason)
  if (status === 408) return new DriveApiError('DRIVE_TIMEOUT', status, reason)
  if (status === 429 || RATE_LIMIT_REASONS.has(key)) {
    return new DriveApiError('DRIVE_RATE_LIMITED', status, reason)
  }
  if (status === 401) return new DriveApiError('GOOGLE_DRIVE_AUTH_FAILED', status, reason)
  if (status === 403) {
    if (STORAGE_REASONS.has(key)) return new DriveApiError('DRIVE_STORAGE_FULL', status, reason)
    if (TOO_LARGE_REASONS.has(key)) return new DriveApiError('DRIVE_FILE_TOO_LARGE', status, reason)
    if (NOT_DOWNLOADABLE_REASONS.has(key)) {
      return new DriveApiError('DRIVE_NOT_DOWNLOADABLE', status, reason)
    }
    return new DriveApiError('DRIVE_ACCESS_FORBIDDEN', status, reason)
  }
  return new DriveApiError('GOOGLE_DRIVE_REQUEST_FAILED', status, reason)
}

/** JSON de Drive; un cuerpo roto o cortado por el timeout es un fallo de Drive, no una excepción suelta. */
export async function readDriveJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new DriveApiError(isAbortLike(error) ? 'DRIVE_TIMEOUT' : 'GOOGLE_DRIVE_REQUEST_FAILED')
  }
}

export async function readDriveBytes(response: Response): Promise<Buffer> {
  try {
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    throw new DriveApiError(isAbortLike(error) ? 'DRIVE_TIMEOUT' : 'GOOGLE_DRIVE_REQUEST_FAILED')
  }
}
