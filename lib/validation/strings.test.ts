import { describe, expect, it } from 'vitest'
import { normalizeUpperNoSpaces, trim } from '@/lib/validation/strings'

describe('trim', () => {
  it('quita espacios, tabs y saltos solo en los extremos', () => {
    expect(trim('  a b \t\n')).toBe('a b')
    expect(trim('')).toBe('')
  })
})

describe('normalizeUpperNoSpaces', () => {
  it('recorta, mayúsculas y elimina TODO whitespace interno', () => {
    expect(normalizeUpperNoSpaces(' a b\tc\nd ')).toBe('ABCD')
    expect(normalizeUpperNoSpaces('es12 3456')).toBe('ES123456')
  })

  it('conserva guiones y otros símbolos', () => {
    expect(normalizeUpperNoSpaces('a-b.c')).toBe('A-B.C')
  })

  it('cadena vacía o solo espacios da vacío', () => {
    expect(normalizeUpperNoSpaces('   ')).toBe('')
  })
})
