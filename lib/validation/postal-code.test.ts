import { describe, expect, it } from 'vitest'
import { isValidSpanishPostalCode } from '@/lib/validation/postal-code'

describe('isValidSpanishPostalCode', () => {
  it.each(['28001', '01001', '00000', '52999', '99999'])('acepta %s', (v) =>
    expect(isValidSpanishPostalCode(v)).toBe(true)
  )

  it('recorta espacios alrededor', () => {
    expect(isValidSpanishPostalCode(' 28001 ')).toBe(true)
  })

  it.each(['', '   ', '2800', '280011', 'ABCDE', '2800a', '28 001', '28-001', '28001\n28001'])(
    'rechaza %j',
    (v) => expect(isValidSpanishPostalCode(v)).toBe(false)
  )
})
