import { authorizedDriveFetch } from '@/src/modules/documents/infrastructure/drive-http'
import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'
import type { IntegrationConnectionStatus } from '@/src/modules/portal/domain/types'

const REQUEST_TIMEOUT_MS = 8_000

/**
 * Ping real a Drive con la cuenta de servicio: la petición más barata que
 * exige un token válido (`about` solo devuelve el usuario). Si la cuenta de
 * servicio no está configurada no hay nada que comprobar → «pendiente».
 */
export async function checkGoogleIntegration(): Promise<IntegrationConnectionStatus> {
  if (!isGoogleDriveApiConfigured()) {
    return 'pending'
  }

  try {
    const response = await authorizedDriveFetch(
      'https://www.googleapis.com/drive/v3/about?fields=user',
      { method: 'GET' },
      REQUEST_TIMEOUT_MS
    )
    return response.ok ? 'connected' : 'error'
  } catch {
    return 'error'
  }
}
