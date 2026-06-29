const REQUEST_TIMEOUT_MS = 8_000

export const ODOO_ERROR = {
  NOT_CONFIGURED: 'ODOO_NOT_CONFIGURED',
  REQUEST_FAILED: 'ODOO_REQUEST_FAILED',
  RATE_LIMITED: 'ODOO_RATE_LIMITED',
} as const

export type OdooServiceErrorCode = 'odoo_rate_limited' | 'odoo_unavailable'

export function resolveOdooErrorCode(error: unknown): OdooServiceErrorCode {
  if (error instanceof Error && error.message === ODOO_ERROR.RATE_LIMITED) {
    return 'odoo_rate_limited'
  }
  return 'odoo_unavailable'
}

export function getOdooBaseUrl(): string | undefined {
  return process.env.ODOO_URL?.replace(/\/$/, '').trim() || undefined
}

export function getOdooApiKey(): string | undefined {
  return process.env.ODOO_API_KEY?.trim() || undefined
}

export function isOdooApiConfigured(): boolean {
  return Boolean(getOdooBaseUrl() && getOdooApiKey())
}

export type OdooSearchReadOptions = {
  domain?: unknown[]
  fields?: string[]
  limit?: number
  order?: string
}

type OdooMany2One = [number, string] | false | null | undefined

export function mapOdooMany2OneLabel(value: OdooMany2One): string | undefined {
  if (!value || !Array.isArray(value)) return undefined
  return value[1] || undefined
}

export function mapOdooMany2OneId(value: OdooMany2One): number | undefined {
  if (!value || !Array.isArray(value)) return undefined
  return typeof value[0] === 'number' ? value[0] : undefined
}

async function odooJsonRequest<T>(
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const baseUrl = getOdooBaseUrl()
  const apiKey = getOdooApiKey()

  if (!baseUrl || !apiKey) {
    throw new Error(ODOO_ERROR.NOT_CONFIGURED)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/json/2/${model}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(
        `[odoo] ${model}/${method} failed (${response.status}):`,
        errorBody.slice(0, 500)
      )
      if (response.status === 429) {
        throw new Error(ODOO_ERROR.RATE_LIMITED)
      }
      throw new Error(ODOO_ERROR.REQUEST_FAILED)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      throw error
    }
    throw new Error(ODOO_ERROR.REQUEST_FAILED)
  } finally {
    clearTimeout(timeout)
  }
}

export async function odooCall<T>(
  model: string,
  method: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  return odooJsonRequest<T>(model, method, body)
}

export async function odooSearchRead<T extends Record<string, unknown>>(
  model: string,
  options: OdooSearchReadOptions = {}
): Promise<T[]> {
  const payload = await odooJsonRequest<T[] | { error?: unknown; message?: string }>(
    model,
    'search_read',
    {
      domain: options.domain ?? [],
      fields: options.fields ?? [],
      limit: options.limit ?? 100,
      ...(options.order ? { order: options.order } : {}),
    }
  )

  if (!Array.isArray(payload)) {
    const detail =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : undefined
    console.error(`[odoo] ${model}/search_read invalid payload:`, detail ?? payload)
    throw new Error(ODOO_ERROR.REQUEST_FAILED)
  }

  return payload
}
