import { describe, expect, it } from 'vitest'
import { isValidEmail } from '@/lib/validation/email'

describe('isValidEmail', () => {
  it.each([
    'a@b.co',
    'user@example.com',
    'user.name+tag@sub.example.es',
    'a@b.c', // mínimo permitido por la regex
    "o'brien@example.com",
  ])('acepta %s', (v) => expect(isValidEmail(v)).toBe(true))

  it('recorta espacios alrededor', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it.each([
    '',
    '   ',
    'user',
    'user@',
    '@example.com',
    'user@example', // sin punto
    'user@.com',
    'user@example.',
    'us er@example.com',
    'user@exa mple.com',
    'user@@example.com',
    'a@b@c.com',
  ])('rechaza %j', (v) => expect(isValidEmail(v)).toBe(false))

  it('no admite saltos de línea ni tabuladores internos', () => {
    expect(isValidEmail('user@example.com\nbcc:x@y.z')).toBe(false)
    expect(isValidEmail('user\t@example.com')).toBe(false)
  })
})
