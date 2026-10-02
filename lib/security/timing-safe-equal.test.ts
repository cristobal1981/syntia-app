import { describe, expect, it } from 'vitest'

import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'

describe('timingSafeEqualStrings', () => {
  it('devuelve true para strings idénticos', () => {
    expect(timingSafeEqualStrings('un-secreto', 'un-secreto')).toBe(true)
  })

  it('devuelve false para strings de igual longitud pero distinto contenido', () => {
    expect(timingSafeEqualStrings('un-secreto', 'otro-secret')).toBe(false)
  })

  it('devuelve false para strings de distinta longitud, sin lanzar', () => {
    expect(timingSafeEqualStrings('corto', 'un-secreto-muy-largo')).toBe(false)
  })

  it('devuelve false comparando contra string vacío', () => {
    expect(timingSafeEqualStrings('un-secreto', '')).toBe(false)
  })
})
