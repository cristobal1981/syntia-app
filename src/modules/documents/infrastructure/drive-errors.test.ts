import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DriveApiError,
  driveErrorFromResponse,
  driveHttpFetch,
  readDriveBytes,
  readDriveJson,
} from '@/src/modules/documents/infrastructure/drive-errors'

function driveError(status: number, reason?: string, raw?: string): Response {
  const body =
    raw ?? JSON.stringify({ error: { code: status, errors: reason ? [{ reason }] : [] } })
  return new Response(body, { status })
}

describe('driveErrorFromResponse — cada respuesta de Drive acaba en un error tipado', () => {
  const table: Array<[string, Response, string]> = [
    ['404', driveError(404), 'DRIVE_ITEM_NOT_FOUND'],
    ['409', driveError(409), 'DRIVE_NAME_CONFLICT'],
    ['408', driveError(408), 'DRIVE_TIMEOUT'],
    ['429', driveError(429), 'DRIVE_RATE_LIMITED'],
    ['403 rateLimitExceeded', driveError(403, 'rateLimitExceeded'), 'DRIVE_RATE_LIMITED'],
    ['403 userRateLimitExceeded', driveError(403, 'userRateLimitExceeded'), 'DRIVE_RATE_LIMITED'],
    ['403 sharingRateLimitExceeded', driveError(403, 'sharingRateLimitExceeded'), 'DRIVE_RATE_LIMITED'],
    ['403 dailyLimitExceeded', driveError(403, 'dailyLimitExceeded'), 'DRIVE_RATE_LIMITED'],
    ['403 storageQuotaExceeded', driveError(403, 'storageQuotaExceeded'), 'DRIVE_STORAGE_FULL'],
    ['403 teamDriveFileLimitExceeded', driveError(403, 'teamDriveFileLimitExceeded'), 'DRIVE_STORAGE_FULL'],
    ['403 exportSizeLimitExceeded', driveError(403, 'exportSizeLimitExceeded'), 'DRIVE_FILE_TOO_LARGE'],
    ['403 fileNotDownloadable', driveError(403, 'fileNotDownloadable'), 'DRIVE_NOT_DOWNLOADABLE'],
    ['403 cannotDownloadFile', driveError(403, 'cannotDownloadFile'), 'DRIVE_NOT_DOWNLOADABLE'],
    ['403 sin motivo', driveError(403), 'DRIVE_ACCESS_FORBIDDEN'],
    ['403 insufficientFilePermissions', driveError(403, 'insufficientFilePermissions'), 'DRIVE_ACCESS_FORBIDDEN'],
    ['401', driveError(401), 'GOOGLE_DRIVE_AUTH_FAILED'],
    ['400', driveError(400), 'GOOGLE_DRIVE_REQUEST_FAILED'],
    ['500', driveError(500), 'GOOGLE_DRIVE_REQUEST_FAILED'],
    ['502', driveError(502), 'GOOGLE_DRIVE_REQUEST_FAILED'],
    ['503', driveError(503), 'GOOGLE_DRIVE_REQUEST_FAILED'],
    ['504', driveError(504), 'GOOGLE_DRIVE_REQUEST_FAILED'],
  ]

  it.each(table)('%s', async (_label, response, expected) => {
    const error = await driveErrorFromResponse(response)
    expect(error).toBeInstanceOf(DriveApiError)
    expect(error.message).toBe(expected)
    expect(error.code).toBe(expected)
  })

  it('conserva el estado HTTP y el motivo para registrarlos', async () => {
    const error = await driveErrorFromResponse(driveError(403, 'storageQuotaExceeded'))
    expect(error.status).toBe(403)
    expect(error.reason).toBe('storageQuotaExceeded')
  })

  it.each([
    ['cuerpo vacío', ''],
    ['no es JSON', '<html>Bad gateway</html>'],
    ['JSON sin error', '{"hola":1}'],
    ['motivo no es texto', '{"error":{"errors":[{"reason":42}]}}'],
    ['errors no es lista', '{"error":{"errors":"x"}}'],
    ['JSON null', 'null'],
  ])('cuerpo ilegible (%s) no rompe el mapeo', async (_label, raw) => {
    const error = await driveErrorFromResponse(driveError(500, undefined, raw))
    expect(error.message).toBe('GOOGLE_DRIVE_REQUEST_FAILED')
  })

  it('un motivo larguísimo se recorta (no se vuelca tal cual a los logs)', async () => {
    const error = await driveErrorFromResponse(driveError(500, 'x'.repeat(5000)))
    expect(error.reason?.length).toBeLessThanOrEqual(80)
  })

  it('el motivo de rate limit se reconoce con otra capitalización o separadores', async () => {
    const error = await driveErrorFromResponse(driveError(403, 'User_Rate_Limit_Exceeded'))
    expect(error.message).toBe('DRIVE_RATE_LIMITED')
  })
})

describe('driveHttpFetch', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('pasa una señal de timeout a fetch', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await driveHttpFetch('https://x.test', {}, 1234)
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it.each(['TimeoutError', 'AbortError'])('%s → DRIVE_TIMEOUT', async (name) => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('t', name) }))
    await expect(driveHttpFetch('https://x.test', {})).rejects.toMatchObject({ message: 'DRIVE_TIMEOUT' })
  })

  it('un timeout real corta una Drive colgada', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    ))
    await expect(driveHttpFetch('https://x.test', {}, 20)).rejects.toMatchObject({ message: 'DRIVE_TIMEOUT' })
  })

  it.each([
    ['TypeError de red', new TypeError('fetch failed')],
    ['error cualquiera', new Error('boom')],
    ['algo que no es Error', 'texto'],
    ['null', null],
  ])('%s → GOOGLE_DRIVE_REQUEST_FAILED (sin filtrar el mensaje original)', async (_l, thrown) => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw thrown }))
    const error = await driveHttpFetch('https://x.test', {}).catch((e: Error) => e)
    expect(error).toMatchObject({ message: 'GOOGLE_DRIVE_REQUEST_FAILED' })
  })
})

describe('readDriveJson / readDriveBytes', () => {
  it('JSON válido', async () => {
    expect(await readDriveJson(new Response('{"a":1}'))).toEqual({ a: 1 })
  })

  it.each(['', 'no es json', '{"a":'])('JSON roto %j → error tipado, no SyntaxError', async (raw) => {
    await expect(readDriveJson(new Response(raw))).rejects.toMatchObject({
      message: 'GOOGLE_DRIVE_REQUEST_FAILED',
    })
  })

  it('un cuerpo cortado por timeout → DRIVE_TIMEOUT', async () => {
    const broken = { json: async () => { throw new DOMException('t', 'TimeoutError') } } as unknown as Response
    await expect(readDriveJson(broken)).rejects.toMatchObject({ message: 'DRIVE_TIMEOUT' })
  })

  it('bytes: lee el cuerpo y, si se corta, error tipado', async () => {
    expect((await readDriveBytes(new Response('abc'))).toString()).toBe('abc')
    const broken = { arrayBuffer: async () => { throw new TypeError('terminated') } } as unknown as Response
    await expect(readDriveBytes(broken)).rejects.toMatchObject({ message: 'GOOGLE_DRIVE_REQUEST_FAILED' })
  })
})
