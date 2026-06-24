const DEFAULT_PAGE_SIZE = 10
const DEFAULT_EXCLUDED_PARTNER_IDS = '2'

export function getChatterPageSize(): number {
  const raw = process.env.ODOO_CHATTER_PAGE_SIZE?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_PAGE_SIZE
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    return DEFAULT_PAGE_SIZE
  }
  return parsed
}

export function getChatterExcludedPartnerIds(): number[] {
  const raw =
    process.env.ODOO_CHATTER_EXCLUDED_PARTNER_IDS?.trim() ||
    DEFAULT_EXCLUDED_PARTNER_IDS

  return raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0)
}

export function shouldFilterInternalChatterMessages(): boolean {
  const raw = process.env.ODOO_CHATTER_FILTER_INTERNAL?.trim()
  if (!raw) return true
  return raw !== 'false' && raw !== '0'
}

export const CHATTER_MESSAGE_MAX_LENGTH = 2000

const DEFAULT_COMMENT_SUBTYPE_ID = 1

export function getChatterCommentSubtypeIdFromEnv(): number | undefined {
  const raw = process.env.ODOO_CHATTER_COMMENT_SUBTYPE_ID?.trim()
  if (!raw) return undefined

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined
  return parsed
}

export function getDefaultChatterCommentSubtypeId(): number {
  return getChatterCommentSubtypeIdFromEnv() ?? DEFAULT_COMMENT_SUBTYPE_ID
}

const DEFAULT_NOTIFICATIONS_POLL_INTERVAL_MS = 60_000

export function getChatterNotificationsPollIntervalMs(): number {
  const raw = process.env.ODOO_CHATTER_NOTIFICATIONS_POLL_INTERVAL_MS?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_NOTIFICATIONS_POLL_INTERVAL_MS
  if (!Number.isInteger(parsed) || parsed < 15_000 || parsed > 600_000) {
    return DEFAULT_NOTIFICATIONS_POLL_INTERVAL_MS
  }
  return parsed
}

const DEFAULT_NOTIFICATIONS_BATCH_LIMIT = 300

export function getChatterNotificationsBatchLimit(): number {
  const raw = process.env.ODOO_CHATTER_NOTIFICATIONS_BATCH_LIMIT?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_NOTIFICATIONS_BATCH_LIMIT
  if (!Number.isInteger(parsed) || parsed < 50 || parsed > 1000) {
    return DEFAULT_NOTIFICATIONS_BATCH_LIMIT
  }
  return parsed
}
