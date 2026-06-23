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
