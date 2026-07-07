import { automatizaciones } from '@/content/automatizaciones'

type WebhookFailure = {
  httpStatus?: number
  errorMessage?: string
}

function isUnfriendlyRawMessage(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('<')) return true
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true
  if (trimmed.length > 160) return true
  return false
}

export function formatAutomationWebhookError(failure: WebhookFailure): string {
  const copy = automatizaciones.errors

  if (failure.httpStatus === 404) {
    return copy.webhookNotFound
  }
  if (failure.httpStatus === 401 || failure.httpStatus === 403) {
    return copy.webhookUnauthorized
  }
  if (failure.httpStatus === 429) {
    return copy.webhookRateLimited
  }
  if (
    failure.httpStatus !== undefined &&
    failure.httpStatus >= 500
  ) {
    return copy.webhookServerError
  }

  const raw = failure.errorMessage?.trim()
  if (raw?.includes('Tiempo de espera agotado')) {
    return copy.webhookTimeout
  }
  if (raw === 'N8N_WEBHOOK_BASE_URL no configurada.') {
    return copy.notConfigured
  }
  if (raw === 'Ruta de webhook vacía.') {
    return copy.webhookInvalidPath
  }
  if (raw && !isUnfriendlyRawMessage(raw)) {
    return raw
  }

  return copy.webhookFailed
}

export function formatAutomationActionError(
  error: string,
  message?: string
): string {
  const copy = automatizaciones.errors

  if (error === 'not_configured') return copy.notConfigured
  if (error === 'forbidden') return copy.forbidden
  if (error === 'not_found') return copy.notFound
  if (error === 'invalid_input' && message) return message
  if (message && !isUnfriendlyRawMessage(message)) return message

  return copy.unknown
}
