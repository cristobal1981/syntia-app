import { describe, expect, it } from 'vitest'

import { isSameOriginRequest } from '@/lib/security/same-origin'

const req = (headers: Record<string, string>) =>
  new Request('https://app.syntia.es/api/x', { method: 'POST', headers })

describe('isSameOriginRequest', () => {
  it('acepta Sec-Fetch-Site same-origin', () => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-origin' }))).toBe(true)
  })

  it.each(['cross-site', 'same-site', 'none'])('rechaza Sec-Fetch-Site %s', (value) => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': value }))).toBe(false)
  })

  it('Sec-Fetch-Site manda sobre un Origin que coincida', () => {
    expect(
      isSameOriginRequest(
        req({ 'sec-fetch-site': 'cross-site', origin: 'https://app.syntia.es', host: 'app.syntia.es' })
      )
    ).toBe(false)
  })

  it('sin Sec-Fetch-Site compara Origin con el host', () => {
    expect(isSameOriginRequest(req({ origin: 'https://app.syntia.es', host: 'app.syntia.es' }))).toBe(true)
    expect(isSameOriginRequest(req({ origin: 'https://evil.example', host: 'app.syntia.es' }))).toBe(false)
  })

  it('detrás de un proxy usa x-forwarded-host', () => {
    expect(
      isSameOriginRequest(
        req({ origin: 'https://app.syntia.es', host: 'internal:3000', 'x-forwarded-host': 'app.syntia.es' })
      )
    ).toBe(true)
  })

  it('sin ninguna cabecera, o con un Origin ilegible, rechaza', () => {
    expect(isSameOriginRequest(req({}))).toBe(false)
    expect(isSameOriginRequest(req({ origin: 'no es url', host: 'app.syntia.es' }))).toBe(false)
  })
})
