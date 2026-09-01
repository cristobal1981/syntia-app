import { describe, expect, it } from 'vitest'

import { automatizaciones } from '@/content/automatizaciones'
import {
  formatAutomationActionError,
  formatAutomationWebhookError,
} from '@/src/modules/automatizaciones/domain/format-automation-errors'

const copy = automatizaciones.errors

describe('formatAutomationWebhookError', () => {
  it('maps known HTTP status codes to specific copy', () => {
    expect(formatAutomationWebhookError({ httpStatus: 404 })).toBe(copy.webhookNotFound)
    expect(formatAutomationWebhookError({ httpStatus: 401 })).toBe(copy.webhookUnauthorized)
    expect(formatAutomationWebhookError({ httpStatus: 403 })).toBe(copy.webhookUnauthorized)
    expect(formatAutomationWebhookError({ httpStatus: 429 })).toBe(copy.webhookRateLimited)
    expect(formatAutomationWebhookError({ httpStatus: 500 })).toBe(copy.webhookServerError)
    expect(formatAutomationWebhookError({ httpStatus: 503 })).toBe(copy.webhookServerError)
  })

  it('httpStatus takes priority over errorMessage when both are present', () => {
    expect(
      formatAutomationWebhookError({
        httpStatus: 404,
        errorMessage: 'Tiempo de espera agotado',
      })
    ).toBe(copy.webhookNotFound)
  })

  it('recognizes specific raw error messages when there is no matching httpStatus', () => {
    expect(
      formatAutomationWebhookError({ errorMessage: 'Tiempo de espera agotado al llamar a n8n.' })
    ).toBe(copy.webhookTimeout)
    expect(
      formatAutomationWebhookError({ errorMessage: 'N8N_WEBHOOK_BASE_URL no configurada.' })
    ).toBe(copy.notConfigured)
    expect(
      formatAutomationWebhookError({ errorMessage: 'Ruta de webhook vacía.' })
    ).toBe(copy.webhookInvalidPath)
  })

  it('passes through a short, human-looking raw message verbatim', () => {
    expect(formatAutomationWebhookError({ errorMessage: 'Algo salió mal' })).toBe(
      'Algo salió mal'
    )
  })

  it('rejects an "unfriendly" raw message (HTML/JSON/too long) and falls back to generic copy', () => {
    expect(
      formatAutomationWebhookError({ errorMessage: '<html>error</html>' })
    ).toBe(copy.webhookFailed)
    expect(
      formatAutomationWebhookError({ errorMessage: '{"error":"boom"}' })
    ).toBe(copy.webhookFailed)
    expect(
      formatAutomationWebhookError({ errorMessage: 'x'.repeat(161) })
    ).toBe(copy.webhookFailed)
  })

  it('falls back to generic copy when there is no httpStatus and no errorMessage at all', () => {
    expect(formatAutomationWebhookError({})).toBe(copy.webhookFailed)
  })
})

describe('formatAutomationActionError', () => {
  it('maps known error codes to their specific copy', () => {
    expect(formatAutomationActionError('not_configured')).toBe(copy.notConfigured)
    expect(formatAutomationActionError('forbidden')).toBe(copy.forbidden)
    expect(formatAutomationActionError('not_found')).toBe(copy.notFound)
  })

  it('for "invalid_input", uses the given message VERBATIM (not a generic fallback)', () => {
    expect(formatAutomationActionError('invalid_input', 'Motivo específico')).toBe(
      'Motivo específico'
    )
  })

  it('for "invalid_input" with NO message, falls through to generic unknown copy', () => {
    expect(formatAutomationActionError('invalid_input')).toBe(copy.unknown)
  })

  it('for any other error code, uses a friendly-looking message when given one', () => {
    expect(formatAutomationActionError('unknown', 'DB connection reset')).toBe(
      'DB connection reset'
    )
  })

  it('rejects an unfriendly message even for otherwise-unhandled error codes', () => {
    expect(formatAutomationActionError('unknown', '<html>boom</html>')).toBe(copy.unknown)
  })
})
