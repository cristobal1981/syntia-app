import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  guardDriveAction,
  logDriveFailure,
  mapDriveErrorToCode,
} from '@/src/modules/documents/application/drive-error-mapping'
import { DriveApiError } from '@/src/modules/documents/infrastructure/drive-errors'

describe('mapDriveErrorToCode', () => {
  it.each([
    ['DRIVE_ITEM_NOT_FOUND', 'not_found'],
    ['DRIVE_ACCESS_FORBIDDEN', 'not_found'], // no se distingue de "no existe": ni oráculo de existencia ni jerga
    ['DRIVE_FILE_TOO_LARGE', 'too_large'],
    ['DRIVE_NAME_CONFLICT', 'name_conflict'],
    ['DRIVE_RATE_LIMITED', 'rate_limited'],
    ['DRIVE_TIMEOUT', 'timeout'],
    ['DRIVE_STORAGE_FULL', 'storage_full'],
    ['DRIVE_NOT_DOWNLOADABLE', 'not_downloadable'],
    ['GOOGLE_DRIVE_NOT_CONFIGURED', 'not_configured'],
    ['GOOGLE_DRIVE_AUTH_FAILED', 'drive_unavailable'],
    ['GOOGLE_DRIVE_REQUEST_FAILED', 'drive_unavailable'],
  ])('%s → %s', (message, expected) => {
    expect(mapDriveErrorToCode(new Error(message))).toBe(expected)
    expect(mapDriveErrorToCode(new DriveApiError(message as never))).toBe(expected)
  })

  it.each([
    ['un Error cualquiera', new Error('connection terminated unexpectedly')],
    ['TypeError', new TypeError('x is not a function')],
    ['un texto', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['un objeto', { message: 'DRIVE_TIMEOUT' }],
  ])('lo desconocido (%s) → unexpected, nunca el mensaje interno', (_l, thrown) => {
    expect(mapDriveErrorToCode(thrown)).toBe('unexpected')
  })
})

describe('logDriveFailure', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it.each([
    'DRIVE_ITEM_NOT_FOUND',
    'DRIVE_ACCESS_FORBIDDEN',
    'DRIVE_FILE_TOO_LARGE',
    'DRIVE_NAME_CONFLICT',
    'DRIVE_NOT_DOWNLOADABLE',
  ])('%s es un resultado esperado: no se registra', (message) => {
    logDriveFailure('download', new Error(message))
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('un fallo de Drive se registra con acción, código, estado y motivo', () => {
    logDriveFailure('list', new DriveApiError('GOOGLE_DRIVE_REQUEST_FAILED', 503, 'backendError'))

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = String(errorSpy.mock.calls[0][0])
    expect(line).toContain('[documents]')
    const entry = JSON.parse(line.replace('[documents] ', ''))
    expect(entry).toMatchObject({
      scope: 'documents',
      action: 'list',
      code: 'drive_unavailable',
      status: 503,
      reason: 'backendError',
    })
  })

  it('rate limit y timeout son avisos (warn), no errores', () => {
    logDriveFailure('upload', new DriveApiError('DRIVE_RATE_LIMITED', 429))
    logDriveFailure('upload', new DriveApiError('DRIVE_TIMEOUT'))
    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('un error inesperado se registra, con los tokens Bearer ocultos y el mensaje recortado', () => {
    logDriveFailure('upload', new Error(`falló con Bearer ya29.SECRETO-LARGO ${'x'.repeat(1000)}`))

    const line = String(errorSpy.mock.calls[0][0])
    expect(line).not.toContain('ya29.SECRETO-LARGO')
    expect(line).toContain('Bearer [oculto]')
    expect(line.length).toBeLessThan(600)
  })

  it('algo que no es Error se registra sin romper', () => {
    expect(() => logDriveFailure('list', 'texto raro')).not.toThrow()
    expect(() => logDriveFailure('list', null)).not.toThrow()
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })
})

describe('guardDriveAction — nunca lanza', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  type Result = { ok: boolean; error?: string }
  const fail = (error: string): Result => ({ ok: false, error })

  it('devuelve el resultado normal intacto', async () => {
    expect(await guardDriveAction<Result>('x', async () => ({ ok: true }), fail)).toEqual({ ok: true })
  })

  it.each([
    [new Error('GOOGLE_DRIVE_REQUEST_FAILED'), 'drive_unavailable'],
    [new Error('DRIVE_TIMEOUT'), 'timeout'],
    [new Error('base de datos caída'), 'unexpected'],
    ['texto', 'unexpected'],
    [undefined, 'unexpected'],
  ])('una excepción (%s) se convierte en { ok:false, error:%s }', async (thrown, expected) => {
    const result = await guardDriveAction('x', async () => { throw thrown }, fail)
    expect(result).toEqual({ ok: false, error: expected })
  })
})
