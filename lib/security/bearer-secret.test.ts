import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hasBearerSecret } from '@/lib/security/bearer-secret'

const ORIGINAL = process.env.TEST_BEARER_SECRET

function req(header?: string): Request {
  return new Request('http://localhost/x', { headers: header ? { authorization: header } : undefined })
}

beforeEach(() => {
  process.env.TEST_BEARER_SECRET = 'abc123'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.TEST_BEARER_SECRET
  else process.env.TEST_BEARER_SECRET = ORIGINAL
  vi.restoreAllMocks()
})

describe('hasBearerSecret', () => {
  it('acepta el secreto correcto', () => {
    expect(hasBearerSecret(req('Bearer abc123'), 'TEST_BEARER_SECRET', 'test')).toBe(true)
  })

  it.each([undefined, '', 'abc123', 'Bearer otro', 'bearer abc123'])(
    'rechaza la cabecera «%s»',
    (header) => {
      expect(hasBearerSecret(req(header), 'TEST_BEARER_SECRET', 'test')).toBe(false)
    }
  )

  it('sin secreto configurado rechaza incluso «Bearer » y lo deja en el log sin el valor', () => {
    delete process.env.TEST_BEARER_SECRET
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(hasBearerSecret(req('Bearer '), 'TEST_BEARER_SECRET', 'mi ruta')).toBe(false)
    expect(log).toHaveBeenCalledWith('[mi ruta] TEST_BEARER_SECRET missing.')
  })

  it('un secreto de solo espacios cuenta como no configurado', () => {
    process.env.TEST_BEARER_SECRET = '   '
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(hasBearerSecret(req('Bearer    '), 'TEST_BEARER_SECRET', 'test')).toBe(false)
  })

  it('usa la variable indicada, no otra', () => {
    process.env.OTHER_SECRET = 'otro'
    expect(hasBearerSecret(req('Bearer otro'), 'TEST_BEARER_SECRET', 'test')).toBe(false)
    delete process.env.OTHER_SECRET
  })
})
