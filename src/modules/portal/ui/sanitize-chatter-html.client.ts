'use client'

import DOMPurify from 'dompurify'

import { normalizeChatterDisplayBody } from '@/src/modules/portal/domain/normalize-chatter-display-body'

const CHATTER_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
]
const CHATTER_ALLOWED_ATTR = ['href', 'target', 'rel']

export function prepareChatterHtmlForDisplay(body: string): string {
  const normalized = normalizeChatterDisplayBody(body)
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<\/p>\s*<p[^>]*>/gi, '</p><p>')

  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: CHATTER_ALLOWED_TAGS,
    ALLOWED_ATTR: CHATTER_ALLOWED_ATTR,
  })
}
