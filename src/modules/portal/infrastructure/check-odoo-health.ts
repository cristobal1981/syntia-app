import type { IntegrationConnectionStatus } from '@/src/modules/portal/domain/types'
import {
  getOdooApiKey,
  getOdooBaseUrl,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

const REQUEST_TIMEOUT_MS = 8_000

export async function checkOdooHealth(): Promise<IntegrationConnectionStatus> {
  const baseUrl = getOdooBaseUrl()
  const apiKey = getOdooApiKey()

  if (!baseUrl) {
    return 'pending'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    if (apiKey) {
      const response = await fetch(`${baseUrl}/json/2/res.users/context_get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
        cache: 'no-store',
      })

      if (response.status === 429) {
        console.warn('[odoo-health] rate limited (429)')
      }

      return response.ok ? 'connected' : 'error'
    }

    const response = await fetch(`${baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'version',
          args: [],
        },
        id: 1,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      return 'error'
    }

    const payload = (await response.json()) as { result?: unknown; error?: unknown }
    return payload.result && !payload.error ? 'connected' : 'error'
  } catch {
    return 'error'
  } finally {
    clearTimeout(timeout)
  }
}
