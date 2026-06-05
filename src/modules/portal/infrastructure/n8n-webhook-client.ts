/**
 * Contrato n8n (automatizaciones). Webhooks vía N8N_WEBHOOK_URL.
 */

export type N8nQueueItem = {
  id: string
  workflow: string
  status: 'queued' | 'running' | 'done' | 'failed'
}

export interface N8nWebhookClient {
  listQueueItems(): Promise<N8nQueueItem[]>
  triggerWorkflow(workflowId: string, payload: Record<string, unknown>): Promise<void>
}

export const n8nWebhookClient: N8nWebhookClient = {
  async listQueueItems() {
    throw new Error('n8n client no configurado')
  },
  async triggerWorkflow() {
    throw new Error('n8n client no configurado')
  },
}
