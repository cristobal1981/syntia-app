import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

const { getRecordDrawerBundleAction } = vi.hoisted(() => ({ getRecordDrawerBundleAction: vi.fn() }))
vi.mock('@/src/modules/portal/application/portal-chatter-actions', () => ({
  getRecordDrawerBundleAction,
}))

import {
  clearDrawerBundleCache,
  DRAWER_BUNDLE_FRESH_MS,
  DRAWER_BUNDLE_MAX_ENTRIES,
  drawerBundleKey,
  ensureDrawerBundleOwner,
  isDrawerBundleFresh,
  loadDrawerBundle,
  prefetchDrawerBundle,
  readDrawerBundle,
  touchDrawerBundle,
  writeDrawerMessages,
} from '@/src/modules/portal/ui/record-drawer-bundle'

function msg(id: number): PortalChatterMessage {
  return { id, bodyHtml: `<p>${id}</p>`, date: '2026-10-26T10:00:00Z', authorName: 'Ana', isFromClient: false }
}

const ok = (ids: number[], description: string | null = null, hasMore = false) => ({
  ok: true as const,
  messages: ids.map(msg),
  hasMore,
  description,
})

beforeEach(() => {
  vi.useRealTimers()
  getRecordDrawerBundleAction.mockReset()
  clearDrawerBundleCache()
})

describe('loadDrawerBundle', () => {
  it('guarda lo recibido y lo devuelve a quien lo lea después', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1, 2], '<p>d</p>', true))

    await loadDrawerBundle('task', 5)

    const cached = readDrawerBundle('task', 5)
    expect(cached?.messages.map((m) => m.id)).toEqual([1, 2])
    expect(cached?.description).toBe('<p>d</p>')
    expect(cached?.hasMore).toBe(true)
  })

  it('las peticiones simultáneas al mismo registro comparten una sola llamada', async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void
    getRecordDrawerBundleAction.mockReturnValue(new Promise((r) => (resolve = r)))

    const a = loadDrawerBundle('task', 5)
    const b = loadDrawerBundle('task', 5)
    resolve(ok([1]))
    await Promise.all([a, b])

    expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(1)
  })

  it('registros distintos (o de distinto tipo) no se mezclan', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1]))

    await Promise.all([loadDrawerBundle('task', 5), loadDrawerBundle('ticket', 5), loadDrawerBundle('task', 6)])

    expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(3)
  })

  it('un error no se guarda', async () => {
    getRecordDrawerBundleAction.mockResolvedValue({ ok: false, error: 'odoo_unavailable' })

    const result = await loadDrawerBundle('task', 5)

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(readDrawerBundle('task', 5)).toBeUndefined()
  })

  it('terminada una petición, la siguiente vuelve a llamar', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1]))

    await loadDrawerBundle('task', 5)
    await loadDrawerBundle('task', 5)

    expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(2)
  })
})

describe('frescura', () => {
  it('es fresco menos de DRAWER_BUNDLE_FRESH_MS y deja de serlo al cumplirse', () => {
    const entry = { messages: [], hasMore: false, at: 1_000 }
    expect(isDrawerBundleFresh(entry, 1_000 + DRAWER_BUNDLE_FRESH_MS - 1)).toBe(true)
    expect(isDrawerBundleFresh(entry, 1_000 + DRAWER_BUNDLE_FRESH_MS)).toBe(false)
  })

  it('guardar la misma conversación no la hace pasar por recién comprobada', () => {
    writeDrawerMessages('task', 5, { messages: [msg(1), msg(2)], hasMore: false }, 1_000)
    writeDrawerMessages('task', 5, { messages: [msg(1), msg(2)], hasMore: true }, 9_000)

    expect(readDrawerBundle('task', 5)?.at).toBe(1_000)
  })

  it('un mensaje nuevo (o propio) sí la refresca', () => {
    writeDrawerMessages('task', 5, { messages: [msg(1)], hasMore: false }, 1_000)
    writeDrawerMessages('task', 5, { messages: [msg(1), msg(2)], hasMore: false }, 9_000)

    expect(readDrawerBundle('task', 5)?.at).toBe(9_000)
  })

  it('con el mismo número de mensajes pero otro último, también cuenta como cambio', () => {
    writeDrawerMessages('task', 5, { messages: [msg(1), msg(2)], hasMore: false }, 1_000)
    writeDrawerMessages('task', 5, { messages: [msg(1), msg(3)], hasMore: false }, 9_000)

    expect(readDrawerBundle('task', 5)?.at).toBe(9_000)
  })

  it('comprobar con Odoo que no hay nada nuevo la refresca', () => {
    writeDrawerMessages('task', 5, { messages: [msg(1)], hasMore: false }, 1_000)
    touchDrawerBundle('task', 5, 7_000)

    expect(readDrawerBundle('task', 5)?.at).toBe(7_000)
  })

  it('tocar un registro que no está guardado no inventa nada', () => {
    touchDrawerBundle('task', 99, 7_000)
    expect(readDrawerBundle('task', 99)).toBeUndefined()
  })

  it('guardar mensajes conserva la descripción ya conocida', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1], '<p>d</p>'))
    await loadDrawerBundle('task', 5)

    writeDrawerMessages('task', 5, { messages: [msg(1), msg(2)], hasMore: false })

    expect(readDrawerBundle('task', 5)?.description).toBe('<p>d</p>')
  })
})

describe('límite y dueño de la caché', () => {
  it('al pasarse del máximo descarta el menos usado, y leer lo marca como usado', () => {
    for (let id = 1; id <= DRAWER_BUNDLE_MAX_ENTRIES; id += 1) {
      writeDrawerMessages('task', id, { messages: [msg(id)], hasMore: false })
    }
    readDrawerBundle('task', 1)
    writeDrawerMessages('task', 1000, { messages: [msg(1)], hasMore: false })

    expect(readDrawerBundle('task', 1)).toBeDefined()
    expect(readDrawerBundle('task', 2)).toBeUndefined()
    expect(readDrawerBundle('task', 1000)).toBeDefined()
  })

  it('cambiar de dueño vacía la caché; con el mismo no se toca', () => {
    ensureDrawerBundleOwner('u1')
    writeDrawerMessages('task', 5, { messages: [msg(1)], hasMore: false })

    ensureDrawerBundleOwner('u1')
    expect(readDrawerBundle('task', 5)).toBeDefined()

    ensureDrawerBundleOwner('u2')
    expect(readDrawerBundle('task', 5)).toBeUndefined()
  })

  it('la clave distingue trámite de consulta', () => {
    expect(drawerBundleKey('task', 5)).not.toBe(drawerBundleKey('ticket', 5))
  })
})

describe('prefetchDrawerBundle', () => {
  it('calienta un registro que no está guardado', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1], null))

    prefetchDrawerBundle('task', 5)
    await vi.waitFor(() => expect(readDrawerBundle('task', 5)).toBeDefined())

    expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(1)
  })

  it('no hace nada si ya está fresco y con descripción', async () => {
    getRecordDrawerBundleAction.mockResolvedValue(ok([1], null))
    await loadDrawerBundle('task', 5)
    getRecordDrawerBundleAction.mockClear()

    prefetchDrawerBundle('task', 5)

    expect(getRecordDrawerBundleAction).not.toHaveBeenCalled()
  })

  it('si lo guardado es solo una conversación (sin descripción), sí se calienta', async () => {
    writeDrawerMessages('task', 5, { messages: [msg(1)], hasMore: false })
    getRecordDrawerBundleAction.mockResolvedValue(ok([1], '<p>d</p>'))

    prefetchDrawerBundle('task', 5)
    await vi.waitFor(() => expect(readDrawerBundle('task', 5)?.description).toBe('<p>d</p>'))
  })

  it('si lo guardado está caducado, se vuelve a pedir', async () => {
    vi.useFakeTimers()
    getRecordDrawerBundleAction.mockResolvedValue(ok([1], null))
    await loadDrawerBundle('task', 5)
    getRecordDrawerBundleAction.mockClear()

    vi.advanceTimersByTime(DRAWER_BUNDLE_FRESH_MS + 1)
    getRecordDrawerBundleAction.mockResolvedValue(ok([1, 2], null))
    prefetchDrawerBundle('task', 5)
    await vi.waitFor(() => expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(1))
  })

  it('con otra precarga en marcha no lanza otra (pasar el ratón por la lista no dispara decenas)', async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void
    getRecordDrawerBundleAction.mockReturnValue(new Promise((r) => (resolve = r)))

    prefetchDrawerBundle('task', 5)
    prefetchDrawerBundle('task', 6)
    prefetchDrawerBundle('ticket', 7)

    expect(getRecordDrawerBundleAction).toHaveBeenCalledTimes(1)
    resolve(ok([1]))
    await vi.waitFor(() => expect(readDrawerBundle('task', 5)).toBeDefined())
  })

  it('un fallo no deja la precarga bloqueada', async () => {
    getRecordDrawerBundleAction.mockRejectedValueOnce(new Error('boom'))
    prefetchDrawerBundle('task', 5)
    await new Promise((r) => setTimeout(r, 0))

    getRecordDrawerBundleAction.mockResolvedValue(ok([1]))
    prefetchDrawerBundle('task', 6)
    await vi.waitFor(() => expect(readDrawerBundle('task', 6)).toBeDefined())
  })
})
