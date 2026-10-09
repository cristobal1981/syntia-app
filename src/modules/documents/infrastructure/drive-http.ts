import {
  DRIVE_REQUEST_TIMEOUT_MS,
  driveHttpFetch,
} from '@/src/modules/documents/infrastructure/drive-errors'
import {
  getGoogleDriveAccessToken,
  invalidateGoogleDriveAccessToken,
} from '@/src/modules/documents/infrastructure/google-drive-auth'

/**
 * Petición autenticada a Drive con timeout. Si Google responde 401 (token
 * revocado o caducado antes de tiempo) se descarta el token en caché y se
 * reintenta UNA vez con uno nuevo.
 */
export async function authorizedDriveFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DRIVE_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const accessToken = await getGoogleDriveAccessToken()
    return driveHttpFetch(
      url,
      {
        ...init,
        headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
        cache: 'no-store',
      },
      timeoutMs
    )
  }

  const response = await attempt()
  if (response.status !== 401) return response

  invalidateGoogleDriveAccessToken()
  return attempt()
}
