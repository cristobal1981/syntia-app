/**
 * Odoo Sign (v16+): pending items live on sign.request.item (partner_id + state).
 * Public signing URL uses sign.request.access_token:
 *   {ODOO_URL}/sign/document/{sign.request.id}/{access_token}
 *
 * Validate pending state values on your Odoo 19 instance; override via env.
 */

const DEFAULT_REQUEST_MODEL = 'sign.request'
const DEFAULT_ITEM_MODEL = 'sign.request.item'
const DEFAULT_ITEM_PENDING_STATES = ['sent', 'shared']
const DEFAULT_REQUEST_ACTIVE_STATES = ['sent', 'shared']

function parseCsvEnv(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function getOdooSignRequestModel(): string {
  return process.env.ODOO_SIGN_REQUEST_MODEL?.trim() || DEFAULT_REQUEST_MODEL
}

export function getOdooSignRequestItemModel(): string {
  return (
    process.env.ODOO_SIGN_REQUEST_ITEM_MODEL?.trim() || DEFAULT_ITEM_MODEL
  )
}

export function getOdooSignItemPendingStates(): string[] {
  return parseCsvEnv(
    process.env.ODOO_SIGN_ITEM_PENDING_STATES,
    DEFAULT_ITEM_PENDING_STATES
  )
}

export function getOdooSignRequestActiveStates(): string[] {
  return parseCsvEnv(
    process.env.ODOO_SIGN_REQUEST_ACTIVE_STATES,
    DEFAULT_REQUEST_ACTIVE_STATES
  )
}

export function buildOdooSignPublicUrl(
  requestId: number,
  accessToken: string
): string | null {
  const base = process.env.ODOO_URL?.trim().replace(/\/$/, '')
  const token = accessToken.trim()
  if (!base || !token) return null
  return `${base}/sign/document/${requestId}/${encodeURIComponent(token)}`
}
