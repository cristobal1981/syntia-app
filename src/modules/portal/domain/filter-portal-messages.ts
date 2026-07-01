import { mapOdooMany2OneId } from '@/src/modules/portal/infrastructure/odoo-json-client'
import {
  prepareChatterHtmlForDisplay,
  sanitizeChatterHtml,
} from '@/src/modules/portal/domain/sanitize-chatter-html.server'
import { normalizeChatterDisplayBody } from '@/src/modules/portal/domain/normalize-chatter-display-body'

export type OdooMailMessageRow = {
  id: number
  body?: string | false | null
  date?: string | false | null
  author_id?: [number, string] | false | null
  message_type?: string | false | null
  parent_id?: [number, string] | false | null
  attachment_ids?: number[] | false | null
}

function rowHasAttachments(row: OdooMailMessageRow): boolean {
  return Array.isArray(row.attachment_ids) && row.attachment_ids.length > 0
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

export function formatChatterBodyFromOdoo(body: string): string {
  return prepareChatterHtmlForDisplay(normalizeChatterDisplayBody(body))
}

export { sanitizeChatterHtml, prepareChatterHtmlForDisplay }

export function isChatterHtmlEmpty(html: string): boolean {
  return stripHtmlToText(html).trim().length === 0
}

export function validateChatterHtmlBody(
  html: string,
  maxLength: number
): { ok: true; value: string } | { ok: false } {
  const textLength = stripHtmlToText(html).trim().length
  if (!textLength || textLength > maxLength) {
    return { ok: false }
  }

  return { ok: true, value: sanitizeChatterHtml(html) }
}

export function hasVisibleMessageBody(body: string | false | null | undefined): boolean {
  if (typeof body !== 'string' || !body.trim()) return false
  return stripHtmlToText(body).trim().length > 0
}

export function isExcludedChatterAuthor(
  authorId: number | undefined,
  excludedPartnerIds: number[]
): boolean {
  if (!authorId) return true
  return excludedPartnerIds.includes(authorId)
}

export function isClientChatterAuthor(
  authorId: number | undefined,
  clientPartnerId: number
): boolean {
  return authorId === clientPartnerId
}

export function filterOdooMailMessageRows(
  rows: OdooMailMessageRow[],
  options: {
    clientPartnerId: number
    excludedPartnerIds: number[]
  }
): OdooMailMessageRow[] {
  return rows.filter((row) => {
    if (!hasVisibleMessageBody(row.body) && !rowHasAttachments(row)) return false

    const authorId = mapOdooMany2OneId(row.author_id)
    if (isExcludedChatterAuthor(authorId, options.excludedPartnerIds)) {
      return false
    }

    const messageType =
      typeof row.message_type === 'string' ? row.message_type : undefined
    if (messageType && !['comment', 'email'].includes(messageType)) {
      return false
    }

    return true
  })
}
