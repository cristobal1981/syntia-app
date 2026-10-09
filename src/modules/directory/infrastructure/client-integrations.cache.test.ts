import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
const upsert = vi.fn()
const eq = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  unstable_cache: (fn: () => unknown) => fn,
}))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ upsert, delete: () => ({ eq }) }),
  }),
}))

import {
  clientDriveRootCacheTag,
  deleteClientIntegration,
  upsertClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'

const fields = { odoo_partner_id: 1, drive_folder_id: null }

describe('invalidación de la carpeta Drive cacheada', () => {
  beforeEach(() => {
    revalidateTag.mockReset()
    upsert.mockReset()
    eq.mockReset()
  })

  it('guardar la integración expira al instante la carpeta de ese usuario', async () => {
    upsert.mockResolvedValue({ error: null })
    await upsertClientIntegration('u1', fields)
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(clientDriveRootCacheTag('u1'), {
      expire: 0,
    })
  })

  it('borrar la integración también la invalida', async () => {
    eq.mockResolvedValue({ error: null })
    await deleteClientIntegration('u1')
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith(clientDriveRootCacheTag('u1'), {
      expire: 0,
    })
  })

  it('si la escritura falla no se invalida nada', async () => {
    upsert.mockResolvedValue({ error: { message: 'boom' } })
    await expect(upsertClientIntegration('u1', fields)).rejects.toThrow('boom')
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('fuera de una petición de Next, la escritura no falla', async () => {
    upsert.mockResolvedValue({ error: null })
    revalidateTag.mockImplementation(() => {
      throw new Error('static generation store missing')
    })
    await expect(upsertClientIntegration('u1', fields)).resolves.toBeUndefined()
  })
})
