import type { DriveDocumentErrorCode } from '@/src/modules/documents/domain/types'

/** Traduce cualquier error interno al código que ve el cliente. Lo desconocido es `unexpected`. */
export function mapDriveErrorToCode(error: unknown): DriveDocumentErrorCode {
  const message = error instanceof Error ? error.message : ''

  switch (message) {
    // Un elemento fuera de la Pública se presenta igual que uno que ya no existe:
    // no se confirma que exista y es lo que ve un cliente cuando el staff lo ha movido.
    case 'DRIVE_ACCESS_FORBIDDEN':
    case 'DRIVE_ITEM_NOT_FOUND':
      return 'not_found'
    case 'DRIVE_FILE_TOO_LARGE':
      return 'too_large'
    case 'DRIVE_NAME_CONFLICT':
      return 'name_conflict'
    case 'DRIVE_RATE_LIMITED':
      return 'rate_limited'
    case 'DRIVE_TIMEOUT':
      return 'timeout'
    case 'DRIVE_STORAGE_FULL':
      return 'storage_full'
    case 'DRIVE_NOT_DOWNLOADABLE':
      return 'not_downloadable'
    case 'GOOGLE_DRIVE_NOT_CONFIGURED':
      return 'not_configured'
    case 'GOOGLE_DRIVE_AUTH_FAILED':
    case 'GOOGLE_DRIVE_REQUEST_FAILED':
      return 'drive_unavailable'
    default:
      return 'unexpected'
  }
}

/** Resultados esperados del negocio: no son un fallo del sistema y no se registran. */
const QUIET_CODES = new Set<DriveDocumentErrorCode>([
  'not_found',
  'forbidden',
  'name_conflict',
  'too_large',
  'not_downloadable',
  'duplicate',
])

function scrub(text: string): string {
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [oculto]').slice(0, 200)
}

/**
 * Registra el fallo en el servidor (Vercel logs) con lo necesario para
 * diagnosticarlo y sin secretos. El cliente solo recibe el código genérico.
 */
export function logDriveFailure(action: string, error: unknown): void {
  const code = mapDriveErrorToCode(error)
  if (QUIET_CODES.has(code)) return

  const detail = error as { name?: unknown; status?: unknown; reason?: unknown } | null
  const entry = {
    scope: 'documents',
    action,
    code,
    cause: error instanceof Error ? scrub(error.message) : 'non-error thrown',
    errorName: typeof detail?.name === 'string' ? detail.name : undefined,
    status: typeof detail?.status === 'number' ? detail.status : undefined,
    reason: typeof detail?.reason === 'string' ? detail.reason : undefined,
  }

  const level = code === 'rate_limited' || code === 'timeout' ? 'warn' : 'error'
  console[level](`[documents] ${JSON.stringify(entry)}`)
}

/**
 * Ejecuta una acción de servidor garantizando que NUNCA lanza: cualquier
 * excepción (BD, sesión, Drive, bug) se registra y vuelve como `{ ok: false }`.
 */
export async function guardDriveAction<T>(
  action: string,
  run: () => Promise<T>,
  fail: (error: DriveDocumentErrorCode) => T
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    logDriveFailure(action, error)
    return fail(mapDriveErrorToCode(error))
  }
}
