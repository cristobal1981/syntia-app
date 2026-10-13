import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizedDriveFetch } from '@/src/modules/documents/infrastructure/drive-http'

const { getGoogleDriveAccessToken, invalidateGoogleDriveAccessToken } = vi.hoisted(() => ({
  getGoogleDriveAccessToken: vi.fn(),
  invalidateGoogleDriveAccessToken: vi.fn(),
}))
vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  getGoogleDriveAccessToken,
  invalidateGoogleDriveAccessToken,
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

const authHeader = (call: number) =>
  new Headers((fetchMock.mock.calls[call][1] as RequestInit).headers).get('authorization')

describe('authorizedDriveFetch', () => {
  it('envía el token y no cachea la respuesta', async () => {
    getGoogleDriveAccessToken.mockResolvedValue('tok-1')
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await authorizedDriveFetch('https://x.test/a')

    expect(authHeader(0)).toBe('Bearer tok-1')
    expect((fetchMock.mock.calls[0][1] as RequestInit).cache).toBe('no-store')
    expect(invalidateGoogleDriveAccessToken).not.toHaveBeenCalled()
  })

  it('ante un 401 descarta el token y reintenta UNA vez con uno nuevo', async () => {
    getGoogleDriveAccessToken.mockResolvedValueOnce('viejo').mockResolvedValueOnce('nuevo')
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))

    const response = await authorizedDriveFetch('https://x.test/a')

    expect(response.status).toBe(200)
    expect(invalidateGoogleDriveAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authHeader(0)).toBe('Bearer viejo')
    expect(authHeader(1)).toBe('Bearer nuevo')
  })

  it('si el reintento también da 401, lo devuelve (no entra en bucle)', async () => {
    getGoogleDriveAccessToken.mockResolvedValue('tok')
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))

    const response = await authorizedDriveFetch('https://x.test/a')

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([403, 404, 429, 500])('un %s NO provoca reintento de token', async (status) => {
    getGoogleDriveAccessToken.mockResolvedValue('tok')
    fetchMock.mockResolvedValue(new Response('{}', { status }))

    await authorizedDriveFetch('https://x.test/a')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(invalidateGoogleDriveAccessToken).not.toHaveBeenCalled()
  })

  it('si no se puede obtener el token, el error se propaga tal cual', async () => {
    getGoogleDriveAccessToken.mockRejectedValue(new Error('GOOGLE_DRIVE_AUTH_FAILED'))
    await expect(authorizedDriveFetch('https://x.test/a')).rejects.toThrow('GOOGLE_DRIVE_AUTH_FAILED')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('las cabeceras propias se respetan y el token no se puede pisar', async () => {
    getGoogleDriveAccessToken.mockResolvedValue('tok')
    fetchMock.mockResolvedValue(new Response('{}'))

    await authorizedDriveFetch('https://x.test/a', { headers: { 'Content-Type': 'application/json' } })

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers)
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('authorization')).toBe('Bearer tok')
  })
})
