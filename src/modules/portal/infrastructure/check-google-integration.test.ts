import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkGoogleIntegration } from '@/src/modules/portal/infrastructure/check-google-integration'

const { authorizedDriveFetch, isGoogleDriveApiConfigured } = vi.hoisted(() => ({
  authorizedDriveFetch: vi.fn(),
  isGoogleDriveApiConfigured: vi.fn(),
}))

vi.mock('@/src/modules/documents/infrastructure/drive-http', () => ({ authorizedDriveFetch }))
vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  isGoogleDriveApiConfigured,
}))

beforeEach(() => {
  vi.resetAllMocks()
  isGoogleDriveApiConfigured.mockReturnValue(true)
})

describe('checkGoogleIntegration', () => {
  it('is pending, WITHOUT any request, when the service account is not configured', async () => {
    isGoogleDriveApiConfigured.mockReturnValue(false)

    await expect(checkGoogleIntegration()).resolves.toBe('pending')
    expect(authorizedDriveFetch).not.toHaveBeenCalled()
  })

  it('is connected when Drive answers ok to an authenticated request', async () => {
    authorizedDriveFetch.mockResolvedValue({ ok: true })

    await expect(checkGoogleIntegration()).resolves.toBe('connected')
    expect(authorizedDriveFetch).toHaveBeenCalledTimes(1)
    expect(authorizedDriveFetch.mock.calls[0][0]).toContain('googleapis.com/drive/v3/about')
  })

  it('is error when Drive answers with a failure status (e.g. 403 revoked key)', async () => {
    authorizedDriveFetch.mockResolvedValue({ ok: false, status: 403 })

    await expect(checkGoogleIntegration()).resolves.toBe('error')
  })

  it('is error (never throws) when the request or the token fails', async () => {
    authorizedDriveFetch.mockRejectedValue(new Error('GOOGLE_DRIVE_AUTH_FAILED'))

    await expect(checkGoogleIntegration()).resolves.toBe('error')
  })
})
