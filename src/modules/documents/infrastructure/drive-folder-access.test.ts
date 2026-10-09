import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assertDriveItemWithinClientTree } from '@/src/modules/documents/infrastructure/drive-folder-access'

const { getGoogleDriveAccessToken } = vi.hoisted(() => ({
  getGoogleDriveAccessToken: vi.fn(),
}))

vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  getGoogleDriveAccessToken,
}))

// Árbol simulado: id -> metadatos con sus padres. Un id ausente responde 404.
type Node = { parents?: string[] }
let tree: Record<string, Node>
const fetchMock = vi.fn()

function idFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
}

// Cada test usa ids propios: la caché de acceso es de módulo y vive 60 s.
let seq = 0
function ids() {
  seq += 1
  return { root: `root-${seq}`, other: `other-${seq}` }
}

beforeEach(() => {
  vi.resetAllMocks()
  getGoogleDriveAccessToken.mockResolvedValue('token')
  tree = {}
  fetchMock.mockImplementation(async (url: string) => {
    const id = idFromUrl(url)
    const node = tree[id]
    if (!node) return new Response('{}', { status: 404 })
    return new Response(JSON.stringify({ id, name: id, ...node }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

describe('assertDriveItemWithinClientTree (aislamiento entre carpetas)', () => {
  it('permite la propia carpeta Pública', async () => {
    const { root } = ids()
    await expect(assertDriveItemWithinClientTree(root, root)).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('permite un hijo directo y un nieto de la Pública', async () => {
    const { root } = ids()
    tree[`${root}-hijo`] = { parents: [root] }
    tree[`${root}-nieto`] = { parents: [`${root}-hijo`] }

    await expect(assertDriveItemWithinClientTree(`${root}-hijo`, root)).resolves.toBeUndefined()
    await expect(assertDriveItemWithinClientTree(`${root}-nieto`, root)).resolves.toBeUndefined()
  })

  it('RECHAZA la carpeta padre de la Pública (ZZ-Test)', async () => {
    const { root } = ids()
    tree[root] = { parents: [`${root}-padre`] }
    tree[`${root}-padre`] = { parents: [`${root}-shared-drive`] }
    tree[`${root}-shared-drive`] = {}

    await expect(assertDriveItemWithinClientTree(`${root}-padre`, root)).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
  })

  it('RECHAZA una carpeta hermana (la Privada) aunque comparta padre con la Pública', async () => {
    const { root } = ids()
    tree[root] = { parents: [`${root}-padre`] }
    tree[`${root}-privada`] = { parents: [`${root}-padre`] }
    tree[`${root}-padre`] = {}

    await expect(assertDriveItemWithinClientTree(`${root}-privada`, root)).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
  })

  it('RECHAZA un archivo dentro de la Pública de OTRO cliente', async () => {
    const { root, other } = ids()
    tree[`${other}-file`] = { parents: [other] }
    tree[other] = {}

    await expect(assertDriveItemWithinClientTree(`${other}-file`, root)).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
  })

  it('RECHAZA ids vacíos sin llamar a Drive', async () => {
    await expect(assertDriveItemWithinClientTree('', 'root')).rejects.toThrow('DRIVE_ACCESS_FORBIDDEN')
    await expect(assertDriveItemWithinClientTree('item', '')).rejects.toThrow('DRIVE_ACCESS_FORBIDDEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('RECHAZA un ciclo de padres sin quedarse en bucle', async () => {
    const { root } = ids()
    tree[`${root}-a`] = { parents: [`${root}-b`] }
    tree[`${root}-b`] = { parents: [`${root}-a`] }

    await expect(assertDriveItemWithinClientTree(`${root}-a`, root)).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
  })

  it('un id inexistente (404 de Drive) NO se trata como permitido', async () => {
    const { root } = ids()
    await expect(assertDriveItemWithinClientTree(`${root}-fantasma`, root)).rejects.toThrow(
      'DRIVE_ITEM_NOT_FOUND'
    )
  })

  it('un fallo de Drive se propaga y NO se cachea como permitido', async () => {
    const { root } = ids()
    tree[`${root}-x`] = { parents: [root] }
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))

    await expect(assertDriveItemWithinClientTree(`${root}-x`, root)).rejects.toThrow(
      'GOOGLE_DRIVE_REQUEST_FAILED'
    )
    await expect(assertDriveItemWithinClientTree(`${root}-x`, root)).resolves.toBeUndefined()
  })

  it('cachea el rechazo: el segundo intento no vuelve a preguntar a Drive', async () => {
    const { root } = ids()
    tree[`${root}-privada`] = {}

    await expect(assertDriveItemWithinClientTree(`${root}-privada`, root)).rejects.toThrow()
    const calls = fetchMock.mock.calls.length
    await expect(assertDriveItemWithinClientTree(`${root}-privada`, root)).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
    expect(fetchMock.mock.calls.length).toBe(calls)
  })
})
