import { describe, expect, it } from 'vitest'

import { resolveSafeRedirectPath } from '@/lib/security/safe-redirect-path'

describe('resolveSafeRedirectPath', () => {
  it('conserva una ruta interna con query y hash', () => {
    expect(resolveSafeRedirectPath('/tramites?open=task-1&tab=documents#top')).toBe(
      '/tramites?open=task-1&tab=documents#top'
    )
  })

  it('usa /dashboard si no hay valor', () => {
    expect(resolveSafeRedirectPath(null)).toBe('/dashboard')
    expect(resolveSafeRedirectPath(undefined)).toBe('/dashboard')
    expect(resolveSafeRedirectPath('')).toBe('/dashboard')
  })

  it('respeta el fallback indicado', () => {
    expect(resolveSafeRedirectPath('https://evil.com', '/login')).toBe('/login')
  })

  it.each([
    'https://evil.com',
    'http://evil.com/x',
    '//evil.com',
    '//evil.com/path',
    '/\\evil.com',
    '\\\\evil.com',
    'evil.com',
    'javascript:alert(1)',
    '/\tevil.com',
    '/\nhttps://evil.com',
    '/%2F%2Fevil.com/..//',
    '/.//evil.com',
    '/a/..//evil.com',
    '/a/../..//evil.com',
  ])('rechaza %j y vuelve a /dashboard', (value) => {
    const result = resolveSafeRedirectPath(value)
    expect(result.startsWith('/')).toBe(true)
    expect(result.startsWith('//')).toBe(false)
    expect(new URL(result, 'https://app.example').origin).toBe('https://app.example')
  })

  it('rechaza los casos claramente externos devolviendo exactamente el fallback', () => {
    for (const value of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '/.//evil.com',
      '/a/..//evil.com',
    ]) {
      expect(resolveSafeRedirectPath(value)).toBe('/dashboard')
    }
  })

  it('rechaza valores demasiado largos', () => {
    expect(resolveSafeRedirectPath(`/${'a'.repeat(3000)}`)).toBe('/dashboard')
  })
})
