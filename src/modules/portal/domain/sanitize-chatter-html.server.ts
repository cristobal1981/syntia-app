const CHATTER_ALLOWED_TAGS = new Set([
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
])

const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']

function removeDangerousBlocks(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
}

function sanitizeAnchorTag(attrs: string): string {
  const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)
  if (!hrefMatch) return ''

  try {
    const url = new URL(hrefMatch[2], 'https://placeholder.local')
    if (!SAFE_LINK_PROTOCOLS.includes(url.protocol)) {
      return ''
    }
  } catch {
    return ''
  }

  const quote = hrefMatch[1]
  const href = hrefMatch[2]
  const relMatch = attrs.match(/\brel\s*=\s*(["'])(.*?)\1/i)
  const targetMatch = attrs.match(/\btarget\s*=\s*(["'])(.*?)\1/i)
  const rel = relMatch ? relMatch[2] : 'noopener noreferrer'
  const target = targetMatch ? targetMatch[2] : '_blank'

  return `<a href=${quote}${href}${quote} rel="${rel}" target="${target}">`
}

function sanitizeOpeningTag(tagName: string, attrs: string): string {
  if (tagName === 'br') return '<br>'

  if (tagName === 'a') {
    return sanitizeAnchorTag(attrs)
  }

  return `<${tagName}>`
}

function sanitizeHtmlTags(html: string): string {
  return html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase()
    if (!CHATTER_ALLOWED_TAGS.has(tag)) return ''

    if (match.startsWith('</')) {
      return `</${tag}>`
    }

    return sanitizeOpeningTag(tag, rawAttrs)
  })
}

export function sanitizeChatterHtml(html: string): string {
  const cleaned = removeDangerousBlocks(html)
  return sanitizeHtmlTags(cleaned)
}

export function prepareChatterHtmlForDisplay(body: string): string {
  const normalized = body
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<\/p>\s*<p[^>]*>/gi, '</p><p>')

  return sanitizeChatterHtml(normalized)
}
