import { describe, expect, it } from 'vitest'

import {
  presentDriveError,
  SECTION_FATAL_CODES,
  type DriveErrorContext,
  type DriveUiErrorCode,
} from '@/src/modules/documents/domain/drive-error-presentation'

// Si se añade un código nuevo, TypeScript obliga a listarlo aquí (y a darle texto).
const ALL_CODES: Record<DriveUiErrorCode, true> = {
  forbidden: true,
  not_linked: true,
  not_found: true,
  drive_unavailable: true,
  not_configured: true,
  session_expired: true,
  duplicate: true,
  name_conflict: true,
  too_large: true,
  invalid_name: true,
  invalid_type: true,
  upload_failed: true,
  rate_limited: true,
  timeout: true,
  storage_full: true,
  not_downloadable: true,
  unexpected: true,
  offline: true,
}
const CODES = Object.keys(ALL_CODES) as DriveUiErrorCode[]
const CONTEXTS: DriveErrorContext[] = ['load', 'folder', 'file', 'upload', 'home']

const TECHNICAL = /GOOGLE_|DRIVE_|undefined|null|\[object|Error:|\bAPI\b|\bHTTP\b|\b[45]\d\d\b|stack|token|exception/i

describe('presentDriveError — todo error tiene un aviso presentable', () => {
  const cases = CODES.flatMap((code) => CONTEXTS.map((context) => [code, context] as const))

  it.each(cases)('%s en contexto %s: título, descripción y salidas válidas', (code, context) => {
    const view = presentDriveError(code, context)

    expect(view.title.trim().length).toBeGreaterThan(3)
    expect(view.description.trim().length).toBeGreaterThan(10)
    expect(view.title).not.toMatch(TECHNICAL)
    expect(view.description).not.toMatch(TECHNICAL)
    expect(view.title.endsWith('.')).toBe(false)
    expect(view.description.endsWith('.')).toBe(true)
    for (const action of view.actions) {
      expect(['retry', 'home', 'login', 'reload', 'dismiss']).toContain(action)
    }
    expect(new Set(view.actions).size).toBe(view.actions.length)
  })

  it('nunca nombra a Google Drive al cliente (para él es "Documentos")', () => {
    for (const [code, context] of cases) {
      const view = presentDriveError(code, context)
      expect(`${view.title} ${view.description}`).not.toMatch(/drive|google/i)
    }
  })

  it('un código desconocido en tiempo de ejecución cae en un aviso genérico, no en undefined', () => {
    const view = presentDriveError('algo_nuevo' as DriveUiErrorCode, 'load')
    expect(view.title).toBeTruthy()
    expect(view.description).toBeTruthy()
    expect(view.title).not.toMatch(TECHNICAL)
  })

  it('sesión caducada ofrece iniciar sesión', () => {
    expect(presentDriveError('session_expired', 'load').actions).toContain('login')
  })

  it.each(['drive_unavailable', 'timeout', 'rate_limited', 'offline', 'unexpected'] as const)(
    '%s se puede reintentar',
    (code) => {
      expect(presentDriveError(code, 'folder').actions).toContain('retry')
    }
  )

  it('lo inesperado también permite recargar la página', () => {
    expect(presentDriveError('unexpected', 'load').actions).toContain('reload')
  })

  it('los avisos informativos de sección (sin acceso, sin configurar...) no ofrecen reintentar', () => {
    for (const code of ['forbidden', 'not_linked', 'not_configured', 'storage_full'] as const) {
      expect(presentDriveError(code, 'load').actions).not.toContain('retry')
    }
  })

  it('solo "no encontrado" marca la lista como desfasada', () => {
    for (const code of CODES) {
      expect(presentDriveError(code, 'folder').staleListing).toBe(code === 'not_found')
    }
  })

  it('"no encontrado" cambia de texto según lo que se hacía', () => {
    const titles = new Set(CONTEXTS.map((c) => presentDriveError('not_found', c).title))
    expect(titles.size).toBe(CONTEXTS.length)
    expect(presentDriveError('not_found', 'file').title).toMatch(/archivo/i)
    expect(presentDriveError('not_found', 'folder').title).toMatch(/carpeta/i)
  })

  it('"no encontrado" ofrece ir a Inicio salvo cuando ya se ha llevado a la persona allí', () => {
    expect(presentDriveError('not_found', 'folder').actions).toContain('home')
    expect(presentDriveError('not_found', 'home').actions).not.toContain('home')
  })

  it('"demasiado grande" explica distinto subir que descargar', () => {
    expect(presentDriveError('too_large', 'upload').description).not.toBe(
      presentDriveError('too_large', 'file').description
    )
  })

  it('los códigos que invalidan la sección son exactamente los que no tienen salida útil dentro de ella', () => {
    expect([...SECTION_FATAL_CODES].sort()).toEqual(
      ['forbidden', 'not_configured', 'not_linked', 'session_expired'].sort()
    )
  })
})
