import {
  driveErrorCopy,
  driveErrorCopyByContext,
  type DriveErrorCopy,
} from '@/content/client-documents-errors'
import type { DriveDocumentErrorCode } from '@/src/modules/documents/domain/types'

/** Errores de la interfaz: los del servidor más los que solo pueden ocurrir en el navegador. */
export type DriveUiErrorCode = DriveDocumentErrorCode | 'offline'

/** Qué estaba haciendo la persona cuando falló (cambia el texto y las salidas). */
export type DriveErrorContext = 'load' | 'folder' | 'file' | 'upload' | 'home'

export type DriveErrorAction = 'retry' | 'home' | 'login' | 'reload' | 'dismiss'

export type DriveErrorPresentation = {
  title: string
  description: string
  actions: DriveErrorAction[]
  tone: 'info' | 'warning' | 'error'
  /** La lista que ve la persona probablemente está desfasada respecto a Drive. */
  staleListing: boolean
}

function copyFor(code: DriveUiErrorCode, context: DriveErrorContext): DriveErrorCopy {
  if (code === 'not_found') return driveErrorCopyByContext.not_found[context]
  if (code === 'too_large') return driveErrorCopyByContext.too_large[context]
  return driveErrorCopy[code as keyof typeof driveErrorCopy] ?? driveErrorCopy.unexpected
}

/** Códigos que invalidan la sección entera (no tiene sentido seguir mostrando la lista). */
export const SECTION_FATAL_CODES: ReadonlySet<DriveUiErrorCode> = new Set([
  'session_expired',
  'forbidden',
  'not_linked',
  'not_configured',
])

export function presentDriveError(
  code: DriveUiErrorCode,
  context: DriveErrorContext
): DriveErrorPresentation {
  const copy = copyFor(code, context)
  const base = { title: copy.title, description: copy.description, staleListing: false }

  switch (code) {
    case 'session_expired':
      return { ...base, actions: ['login'], tone: 'warning' }
    case 'forbidden':
    case 'not_linked':
    case 'not_configured':
    case 'storage_full':
      return { ...base, actions: [], tone: code === 'forbidden' ? 'error' : 'info' }
    case 'not_found':
      return {
        ...base,
        actions: context === 'home' || context === 'load' ? ['dismiss'] : ['home', 'dismiss'],
        tone: 'warning',
        staleListing: true,
      }
    case 'drive_unavailable':
    case 'timeout':
    case 'rate_limited':
    case 'offline':
      return { ...base, actions: ['retry'], tone: 'warning' }
    case 'unexpected':
      return { ...base, actions: ['retry', 'reload'], tone: 'error' }
    case 'duplicate':
    case 'name_conflict':
    case 'invalid_name':
    case 'invalid_type':
    case 'upload_failed':
    case 'too_large':
    case 'not_downloadable':
      return { ...base, actions: ['dismiss'], tone: 'warning' }
    default: {
      const unreachable: never = code
      void unreachable
      return { ...base, actions: ['reload'], tone: 'error' }
    }
  }
}
