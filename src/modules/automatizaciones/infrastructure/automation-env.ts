const DEFAULT_TRIGGER_TIMEOUT_MS = 15_000

export function getN8nWebhookBaseUrl(): string | null {
  const value =
    process.env.N8N_WEBHOOK_BASE_URL?.trim() ??
    process.env.N8N_WEBHOOK_URL?.trim() ??
    ''
  if (!value) return null
  return value.replace(/\/$/, '')
}

export function getN8nAutomationWebhookSecret(): string | null {
  const value = process.env.N8N_AUTOMATION_WEBHOOK_SECRET?.trim()
  return value || null
}

export function isAutomatizacionesConfigured(): boolean {
  return Boolean(getN8nWebhookBaseUrl())
}

export function getAutomationTriggerTimeoutMs(): number {
  const raw = process.env.N8N_AUTOMATION_TRIGGER_TIMEOUT_MS?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isInteger(parsed) && parsed >= 3_000 && parsed <= 60_000) {
    return parsed
  }
  return DEFAULT_TRIGGER_TIMEOUT_MS
}
