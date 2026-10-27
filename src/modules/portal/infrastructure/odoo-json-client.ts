const REQUEST_TIMEOUT_MS = 8_000
const MAX_CONCURRENT_ODOO_REQUESTS = 5
const RATE_LIMIT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000]

/**
 * `ODOO_REQUEST_LOG=1` deja una línea `[odoo-req]` por cada petición correcta
 * (modelo, método, intentos y ms) para medir cuántas se hacen por minuto desde
 * los logs. Desactivado por defecto: son muchas líneas.
 */
function isRequestLogEnabled(): boolean {
  return process.env.ODOO_REQUEST_LOG === '1'
}

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

/**
 * Enlace directo a un registro en el cliente web de Odoo (para que el staff
 * pueda abrir la tarea desde fuera de Odoo, p. ej. un email). Usa la ruta
 * clásica `/web#...`, soportada en todas las versiones de Odoo (incluida
 * Odoo Online) aunque la UI por defecto use rutas nuevas — Odoo la
 * redirige internamente. Sin verificar en vivo contra esta instancia
 * concreta; confirmar el primer enlace real antes de confiar en él.
 */
export function buildOdooRecordUrl(model: string, recordId: number): string | undefined {
  const baseUrl = getOdooBaseUrl()
  if (!baseUrl) return undefined
  return `${baseUrl}/web#id=${recordId}&model=${encodeURIComponent(model)}&view_type=form`
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

/**
 * Semáforo en proceso: limita las llamadas simultáneas a Odoo para no
 * disparar su rate limit (429) cuando varias vistas piden datos a la vez.
 */
let activeOdooRequests = 0
const odooRequestQueue: Array<() => void> = []
const odooPriorityQueue: Array<() => void> = []

// Sin `import 'node:async_hooks'` estático: este fichero llega al bundle del navegador por los
// mapeadores de dominio (`mapOdooMany2OneId`...) y Turbopack no admite ese módulo allí. En el
// servidor se obtiene en ejecución; en el navegador no existe y la prioridad no hace nada.
const odooPriorityContext = (() => {
  if (typeof process === 'undefined' || typeof process.getBuiltinModule !== 'function') return undefined
  return new (process.getBuiltinModule('node:async_hooks').AsyncLocalStorage)<true>()
})()

/**
 * Marca como prioritarias las llamadas a Odoo que haga `task` (y todo lo que esta lance): se
 * saltan la cola de las de fondo (sondeos, repintado de listas). Para lo que el usuario está
 * esperando mirando la pantalla, como el chat que acaba de abrir: sin esto sus lecturas esperan
 * detrás de decenas de peticiones de fondo y una carga de 1,5 s pasa de 10 s.
 */
export function runWithOdooPriority<T>(task: () => Promise<T>): Promise<T> {
  return odooPriorityContext ? odooPriorityContext.run(true, task) : task()
}

function acquireOdooRequestSlot(): Promise<void> {
  if (activeOdooRequests < MAX_CONCURRENT_ODOO_REQUESTS) {
    activeOdooRequests += 1
    return Promise.resolve()
  }

  const queue = odooPriorityContext?.getStore() ? odooPriorityQueue : odooRequestQueue
  return new Promise((resolve) => {
    queue.push(() => {
      activeOdooRequests += 1
      resolve()
    })
  })
}

function releaseOdooRequestSlot() {
  activeOdooRequests = Math.max(0, activeOdooRequests - 1)
  const next = odooPriorityQueue.shift() ?? odooRequestQueue.shift()
  next?.()
}

function parseRetryAfterMs(response: Response): number | undefined {
  const header = response.headers.get('retry-after')?.trim()
  if (!header) return undefined

  const seconds = Number.parseInt(header, 10)
  if (Number.isInteger(seconds) && seconds > 0) {
    return seconds * 1_000
  }

  const dateMs = Date.parse(header)
  if (!Number.isNaN(dateMs)) {
    const delay = dateMs - Date.now()
    return delay > 0 ? delay : undefined
  }

  return undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function odooJsonRequestOnce<T>(
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; body: string; retryAfterMs?: number }
> {
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
      return {
        ok: false,
        status: response.status,
        body: errorBody,
        retryAfterMs: parseRetryAfterMs(response),
      }
    }

    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      throw error
    }
    throw new Error(ODOO_ERROR.REQUEST_FAILED)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Una petición con slot de concurrencia y reintentos solo ante 429
 * (respeta Retry-After si viene). Otros fallos HTTP no se reintentan.
 */
async function odooJsonRequest<T>(
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  await acquireOdooRequestSlot()
  const startedAt = Date.now()

  try {
    for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt += 1) {
      const result = await odooJsonRequestOnce<T>(model, method, body)

      if (result.ok) {
        if (isRequestLogEnabled()) {
          console.info(
            `[odoo-req] ${model}/${method} ok attempts=${attempt + 1} ${Date.now() - startedAt}ms`
          )
        }
        return result.data
      }

      if (result.status === 429) {
        if (attempt >= RATE_LIMIT_RETRY_DELAYS_MS.length) {
          console.error(
            `[odoo] ${model}/${method} rate limited after retries:`,
            result.body.slice(0, 500)
          )
          throw new Error(ODOO_ERROR.RATE_LIMITED)
        }

        const delayMs =
          result.retryAfterMs ?? RATE_LIMIT_RETRY_DELAYS_MS[attempt] ?? 1_000
        console.warn(
          `[odoo] ${model}/${method} 429, reintento ${attempt + 1}/${RATE_LIMIT_RETRY_DELAYS_MS.length} en ${delayMs}ms`
        )
        await sleep(delayMs)
        continue
      }

      console.error(
        `[odoo] ${model}/${method} failed (${result.status}):`,
        result.body.slice(0, 500)
      )
      throw new Error(ODOO_ERROR.REQUEST_FAILED)
    }

    throw new Error(ODOO_ERROR.RATE_LIMITED)
  } finally {
    releaseOdooRequestSlot()
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
