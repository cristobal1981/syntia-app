import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'

const getIntegration = vi.fn()

vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId: vi.fn(async () => 'actor-1'),
}))
vi.mock('@/src/modules/directory/infrastructure/client-integrations.supabase', () => ({
  getClientIntegrationByUserId: (...args: unknown[]) => getIntegration(...args),
}))

import { resolveClientDriveRootId } from '@/src/modules/documents/application/resolve-client-drive-root'

const user = { id: 'u1' } as PortalUser

describe('resolveClientDriveRootId', () => {
  beforeEach(() => getIntegration.mockReset())

  it('devuelve el id de la carpeta sin espacios', async () => {
    getIntegration.mockResolvedValue({ drive_folder_id: '  abc123 ' })
    expect(await resolveClientDriveRootId(user)).toBe('abc123')
  })

  it('devuelve null si no hay integración o el id está vacío', async () => {
    getIntegration.mockResolvedValueOnce(null)
    expect(await resolveClientDriveRootId(user)).toBeNull()
    getIntegration.mockResolvedValueOnce({ drive_folder_id: '   ' })
    expect(await resolveClientDriveRootId(user)).toBeNull()
  })

  it('no cachea: quitar el id surte efecto en la siguiente llamada', async () => {
    getIntegration.mockResolvedValueOnce({ drive_folder_id: 'abc123' })
    getIntegration.mockResolvedValueOnce({ drive_folder_id: null })

    expect(await resolveClientDriveRootId(user)).toBe('abc123')
    expect(await resolveClientDriveRootId(user)).toBeNull()
    expect(getIntegration).toHaveBeenCalledTimes(2)
  })
})
