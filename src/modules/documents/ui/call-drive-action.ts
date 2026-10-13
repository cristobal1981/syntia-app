import type { DriveUiErrorCode } from '@/src/modules/documents/domain/drive-error-presentation'

/**
 * Llama a una acción de servidor sin que una excepción llegue nunca a la
 * interfaz: sin red → `offline`; cualquier otro fallo (despliegue nuevo con la
 * pestaña vieja, corte de red, 500...) → `unexpected`.
 */
export async function callDriveAction<T extends { ok: boolean }>(
  run: () => Promise<T>
): Promise<T | { ok: false; error: DriveUiErrorCode }> {
  if (isOffline()) {
    return { ok: false, error: 'offline' }
  }
  try {
    return await run()
  } catch {
    return { ok: false, error: isOffline() ? 'offline' : 'unexpected' }
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
