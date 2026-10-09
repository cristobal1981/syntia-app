import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as repository from '@/src/modules/documents/infrastructure/google-drive-repository'

const { getGoogleDriveAccessToken, assertDriveItemWithinClientTree } = vi.hoisted(() => ({
  getGoogleDriveAccessToken: vi.fn(),
  assertDriveItemWithinClientTree: vi.fn(),
}))

vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  getGoogleDriveAccessToken,
}))
vi.mock('@/src/modules/documents/infrastructure/drive-folder-access', () => ({
  assertDriveItemWithinClientTree,
  buildDriveBreadcrumbs: vi.fn().mockResolvedValue([]),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  getGoogleDriveAccessToken.mockResolvedValue('token')
  assertDriveItemWithinClientTree.mockResolvedValue(undefined)
  vi.stubGlobal('fetch', fetchMock)
})

describe('google-drive-repository (solo leer, descargar y subir)', () => {
  it('no exporta operaciones de renombrar, mover, eliminar ni crear carpetas', () => {
    expect(Object.keys(repository).sort()).toEqual(
      ['downloadDriveFile', 'findDuplicateInSubtree', 'listDriveFolder', 'uploadDriveFile'].sort()
    )
  })

  it('listar solo usa GET; subir solo usa POST', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ files: [] }), { status: 200 }))
    await repository.listDriveFolder('folder', 'root')

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'f', name: 'a.pdf', mimeType: 'application/pdf' }), {
        status: 200,
      })
    )
    await repository.uploadDriveFile(
      'folder',
      { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
      'root'
    )

    const methods = fetchMock.mock.calls.map(([, init]) => (init?.method ?? 'GET') as string)
    expect(methods).toEqual(['GET', 'POST'])
  })

  it('subir comprueba que la carpeta destino está dentro de la Pública antes de llamar a Drive', async () => {
    assertDriveItemWithinClientTree.mockRejectedValue(new Error('DRIVE_ACCESS_FORBIDDEN'))

    await expect(
      repository.uploadDriveFile(
        'carpeta-ajena',
        { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
        'root'
      )
    ).rejects.toThrow('DRIVE_ACCESS_FORBIDDEN')

    expect(assertDriveItemWithinClientTree).toHaveBeenCalledWith('carpeta-ajena', 'root')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('descargar comprueba que el archivo está dentro de la Pública antes de llamar a Drive', async () => {
    assertDriveItemWithinClientTree.mockRejectedValue(new Error('DRIVE_ACCESS_FORBIDDEN'))

    await expect(repository.downloadDriveFile('archivo-ajeno', 'root')).rejects.toThrow(
      'DRIVE_ACCESS_FORBIDDEN'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
