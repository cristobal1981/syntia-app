import { describe, expect, it } from 'vitest'

import {
  normalizeDriveFolderInput,
  validateDriveFolderId,
} from '@/src/modules/directory/application/validate-directory'

const ID = '1AbC_dEf-GhIjKlMnOpQrStUvWx'

describe('normalizeDriveFolderInput — URLs pegadas por el staff', () => {
  it.each([
    [`https://drive.google.com/drive/folders/${ID}`, ID],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, ID],
    [`https://drive.google.com/drive/u/0/folders/${ID}`, ID],
    [`https://drive.google.com/drive/u/1/folders/${ID}?resourcekey=0-abc`, ID],
    [`https://drive.google.com/open?id=${ID}`, ID],
    [`  https://drive.google.com/drive/folders/${ID}  `, ID],
    [ID, ID],
  ])('extrae el id de %j', (input, expected) => {
    expect(normalizeDriveFolderInput(input)).toBe(expected)
  })

  it.each([
    ['otro dominio', `https://evil.example.com/drive/folders/${ID}`],
    ['dominio que contiene drive.google.com', `https://drive.google.com.evil.io/drive/folders/${ID}`],
    ['usuario@host', `https://drive.google.com@evil.io/drive/folders/${ID}`],
    ['esquema javascript', `javascript:alert(1)//folders/${ID}`],
    ['URL de archivo, no de carpeta', `https://drive.google.com/file/d/${ID}/view`],
    ['URL de documento', `https://docs.google.com/document/d/${ID}/edit`],
  ])('NO acepta una URL de %s como carpeta válida', (_label, input) => {
    const normalized = normalizeDriveFolderInput(input)
    expect(validateDriveFolderId(normalized ?? '')).toBeDefined()
  })

  it('con dos segmentos /folders/ coge la carpeta más interna (la última), no la ancestra', () => {
    const outer = 'OUTERFOLDERID1234567890'
    expect(
      normalizeDriveFolderInput(`https://drive.google.com/drive/folders/${outer}/folders/${ID}`)
    ).toBe(ID)
  })

  it('un id de carpeta en el query de otra ruta no se confunde con la carpeta', () => {
    const normalized = normalizeDriveFolderInput(
      `https://drive.google.com/drive/folders/${ID}?next=/folders/OTHERFOLDER12345678`
    )
    expect(normalized).toBe(ID)
  })
})

describe('validateDriveFolderId — ids hostiles', () => {
  it.each([
    ['con espacio', `${ID} x`],
    ['con comilla', `${ID}'`],
    ['con barra', `${ID}/x`],
    ['con salto de línea', `${ID}\nOTRO`],
    ['con nulo', `${ID}\u0000`],
    ['unicode', 'carpeta-ñandú-123456'],
    ['demasiado corto', 'abc123'],
    ['url completa', `https://drive.google.com/drive/folders/${ID}`],
    ['inyección SQL', "x'; drop table client_integrations; --"],
    ['absurdamente largo', 'a'.repeat(5000)],
  ])('rechaza un id %s', (_label, value) => {
    expect(validateDriveFolderId(value)).toMatch(/no es válido/)
  })

  it('acepta ids reales de 19, 28, 33 y 44 caracteres', () => {
    for (const length of [19, 28, 33, 44]) {
      expect(validateDriveFolderId('A1_-'.repeat(20).slice(0, length))).toBeUndefined()
    }
  })
})
