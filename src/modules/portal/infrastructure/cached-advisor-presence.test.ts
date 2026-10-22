import { beforeEach, describe, expect, it, vi } from 'vitest'

const { unstableCache, fetchAdvisorPresenceFromOdoo } = vi.hoisted(() => ({
  unstableCache: vi.fn(),
  fetchAdvisorPresenceFromOdoo: vi.fn(),
}))

vi.mock('next/cache', () => ({ unstable_cache: unstableCache }))
vi.mock('@/src/modules/portal/infrastructure/odoo-advisor-presence', () => ({
  fetchAdvisorPresenceFromOdoo,
}))

import {
  ADVISOR_PRESENCE_REVALIDATE_SECONDS,
  getCachedAdvisorPresence,
} from '@/src/modules/portal/infrastructure/cached-advisor-presence'

beforeEach(() => {
  vi.resetAllMocks()
  unstableCache.mockImplementation((fn: () => unknown) => fn)
})

describe('getCachedAdvisorPresence', () => {
  it('cachea un minuto, con clave propia de cada asesor', async () => {
    fetchAdvisorPresenceFromOdoo.mockResolvedValue('online')
    await getCachedAdvisorPresence(42)

    expect(unstableCache).toHaveBeenCalledWith(expect.any(Function), ['advisor-presence', '42'], {
      revalidate: 60,
    })
    expect(ADVISOR_PRESENCE_REVALIDATE_SECONDS).toBe(60)
  })

  it('pide a Odoo la presencia del asesor indicado y la devuelve', async () => {
    fetchAdvisorPresenceFromOdoo.mockResolvedValue('away')

    await expect(getCachedAdvisorPresence(7)).resolves.toBe('away')
    expect(fetchAdvisorPresenceFromOdoo).toHaveBeenCalledWith(7)
  })

  it('un asesor sin usuario devuelve null', async () => {
    fetchAdvisorPresenceFromOdoo.mockResolvedValue(null)
    await expect(getCachedAdvisorPresence(7)).resolves.toBeNull()
  })

  it('propaga el error de Odoo para que no se cachee', async () => {
    fetchAdvisorPresenceFromOdoo.mockRejectedValue(new Error('odoo'))
    await expect(getCachedAdvisorPresence(7)).rejects.toThrow('odoo')
  })
})
