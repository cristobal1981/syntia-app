import { describe, expect, it } from 'vitest'

import {
  buildFolderUrl,
  parseFolderParam,
} from '@/src/modules/documents/domain/drive-folder-url'

describe('parseFolderParam', () => {
  it('sin parámetro o vacío es Inicio', () => {
    expect(parseFolderParam(null)).toBeNull()
    expect(parseFolderParam(undefined)).toBeNull()
    expect(parseFolderParam('')).toBeNull()
    expect(parseFolderParam('   ')).toBeNull()
  })

  it('recorta espacios y conserva el id', () => {
    expect(parseFolderParam('  1AbC_dEf-123  ')).toBe('1AbC_dEf-123')
  })

  it('descarta ids absurdamente largos sin llegar al servidor', () => {
    expect(parseFolderParam('a'.repeat(128))).toBe('a'.repeat(128))
    expect(parseFolderParam('a'.repeat(129))).toBeNull()
  })
})

describe('buildFolderUrl', () => {
  it('Inicio no lleva parámetro', () => {
    expect(buildFolderUrl('/documentos', '', null)).toBe('/documentos')
    expect(buildFolderUrl('/documentos', '?carpeta=abc', null)).toBe('/documentos')
  })

  it('carpeta concreta va en ?carpeta=', () => {
    expect(buildFolderUrl('/documentos', '', 'abc123')).toBe('/documentos?carpeta=abc123')
  })

  it('sustituye la carpeta anterior y conserva otros parámetros', () => {
    expect(buildFolderUrl('/documentos', '?carpeta=vieja&q=factura', 'nueva')).toBe(
      '/documentos?carpeta=nueva&q=factura'
    )
    expect(buildFolderUrl('/documentos', '?carpeta=vieja&q=factura', null)).toBe(
      '/documentos?q=factura'
    )
  })

  it('codifica caracteres que rompen la URL', () => {
    expect(buildFolderUrl('/documentos', '', 'a&b=c')).toBe('/documentos?carpeta=a%26b%3Dc')
  })
})
