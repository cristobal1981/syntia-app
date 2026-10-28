import { describe, expect, it, vi } from 'vitest'

import { runPortalRefresh } from '@/src/modules/portal/ui/run-portal-refresh'

describe('runPortalRefresh', () => {
  it('si la acción sale bien no repinta aparte (Next ya repinta con la respuesta de la acción)', async () => {
    const repaint = vi.fn()

    await runPortalRefresh(async () => ({ ok: true }), repaint)

    expect(repaint).not.toHaveBeenCalled()
  })

  it('si la acción responde que no (límite, sin permiso) repinta con lo que haya', async () => {
    const repaint = vi.fn()

    await runPortalRefresh(async () => ({ ok: false }), repaint)

    expect(repaint).toHaveBeenCalledTimes(1)
  })

  it('si la acción falla o la red cae repinta y no propaga el error', async () => {
    const repaint = vi.fn()

    await expect(
      runPortalRefresh(() => Promise.reject(new Error('red caída')), repaint),
    ).resolves.toBeUndefined()

    expect(repaint).toHaveBeenCalledTimes(1)
  })

  it('espera a que termine la acción antes de decidir', async () => {
    const order: string[] = []
    const repaint = vi.fn(() => order.push('repaint'))

    await runPortalRefresh(async () => {
      await Promise.resolve()
      order.push('action')
      return { ok: false }
    }, repaint)

    expect(order).toEqual(['action', 'repaint'])
  })
})
