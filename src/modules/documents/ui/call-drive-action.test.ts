import { afterEach, describe, expect, it, vi } from 'vitest'

import { callDriveAction } from '@/src/modules/documents/ui/call-drive-action'

afterEach(() => vi.unstubAllGlobals())

describe('callDriveAction', () => {
  it('devuelve el resultado de la acción tal cual', async () => {
    expect(await callDriveAction(async () => ({ ok: true as const, value: 1 }))).toEqual({ ok: true, value: 1 })
    expect(await callDriveAction(async () => ({ ok: false as const, error: 'not_found' }))).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('sin red NI SIQUIERA llama a la acción', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const run = vi.fn(async () => ({ ok: true as const }))
    expect(await callDriveAction(run)).toEqual({ ok: false, error: 'offline' })
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['servidor reinicia / despliegue nuevo', new Error('Failed to find Server Action "abc"')],
    ['corte de red', new TypeError('Failed to fetch')],
    ['algo que no es Error', 'boom'],
    ['null', null],
  ])('si la acción lanza (%s) → unexpected, sin excepción en consola', async (_l, thrown) => {
    vi.stubGlobal('navigator', { onLine: true })
    const result = await callDriveAction(async () => {
      throw thrown
    })
    expect(result).toEqual({ ok: false, error: 'unexpected' })
  })

  it('si lanza porque se cayó la red a mitad → offline', async () => {
    const nav = { onLine: true }
    vi.stubGlobal('navigator', nav)
    const result = await callDriveAction(async () => {
      nav.onLine = false
      throw new TypeError('Failed to fetch')
    })
    expect(result).toEqual({ ok: false, error: 'offline' })
  })

  it('en un entorno sin navigator funciona', async () => {
    vi.stubGlobal('navigator', undefined)
    expect(await callDriveAction(async () => ({ ok: true as const }))).toEqual({ ok: true })
  })
})
