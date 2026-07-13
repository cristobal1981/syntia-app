import {
  getAutomationTriggerTimeoutMs,
  getN8nAutomationWebhookSecret,
  getN8nWebhookBaseUrl,
} from '@/src/modules/automatizaciones/infrastructure/automation-env'

export type TriggerAutomationWebhookResult =
  | { ok: true; httpStatus: number }
  | { ok: false; httpStatus?: number; errorMessage: string }

export type TriggerAutomationWebhookPayload = Record<string, string>

function joinWebhookUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

export async function triggerAutomationWebhook(
  webhookPath: string,
  payload: TriggerAutomationWebhookPayload
): Promise<TriggerAutomationWebhookResult> {
  const baseUrl = getN8nWebhookBaseUrl()
  if (!baseUrl) {
    return { ok: false, errorMessage: 'N8N_WEBHOOK_BASE_URL no configurada.' }
  }

  const path = webhookPath.trim()
  if (!path) {
    return { ok: false, errorMessage: 'Ruta de webhook vacía.' }
  }

  const secret = getN8nAutomationWebhookSecret()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    getAutomationTriggerTimeoutMs()
  )

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (secret) {
      headers['X-Portal-Automation-Secret'] = secret
    }

    const response = await fetch(joinWebhookUrl(baseUrl, path), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (response.ok) {
      return { ok: true, httpStatus: response.status }
    }

    const body = await response.text().catch(() => '')
    return {
      ok: false,
      httpStatus: response.status,
      errorMessage: body.slice(0, 300) || `HTTP ${response.status}`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, errorMessage: 'Tiempo de espera agotado al llamar a n8n.' }
    }
    return {
      ok: false,
      errorMessage:
        error instanceof Error ? error.message : 'Error de red al llamar a n8n.',
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** @deprecated Stub legacy — usar triggerAutomationWebhook */
export type N8nQueueItem = {
  id: string
  workflow: string
  status: 'queued' | 'running' | 'done' | 'failed'
}

/** @deprecated Stub legacy */
export interface N8nWebhookClient {
  listQueueItems(): Promise<N8nQueueItem[]>
  triggerWorkflow(workflowId: string, payload: Record<string, unknown>): Promise<void>
}

/** @deprecated Stub legacy */
export const n8nWebhookClient: N8nWebhookClient = {
  async listQueueItems() {
    throw new Error('n8n client no configurado')
  },
  async triggerWorkflow() {
    throw new Error('n8n client no configurado')
  },
}
