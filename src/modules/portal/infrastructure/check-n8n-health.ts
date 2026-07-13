import type { IntegrationConnectionStatus } from '@/src/modules/portal/domain/types'

const REQUEST_TIMEOUT_MS = 8_000

function getN8nBaseUrl(): string | undefined {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim()
  if (!webhookUrl) {
    return undefined
  }

  try {
    return new URL(webhookUrl).origin
  } catch {
    return undefined
  }
}

export async function checkN8nHealth(): Promise<IntegrationConnectionStatus> {
  const baseUrl = getN8nBaseUrl()

  if (!baseUrl) {
    return 'pending'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/healthz`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })

    return response.ok ? 'connected' : 'error'
  } catch {
    return 'error'
  } finally {
    clearTimeout(timeout)
  }
}
