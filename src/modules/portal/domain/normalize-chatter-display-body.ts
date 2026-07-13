function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const REPLY_CUT_PATTERNS = [
  /\bel\s+.+?\s+escribi[oó]:/i,
  /\bon\s+.+?\s+wrote:/i,
  /-----original message-----/i,
  /_{5,}/,
] as const

function stripEmailQuoteBlocks(html: string): string {
  let result = html

  result = result.replace(
    /<div[^>]*class=["'][^"']*gmail_quote[^"']*["'][^>]*>[\s\S]*$/i,
    ''
  )
  result = result.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')

  const textForCut = stripHtmlToText(result)
  let cutIndex = textForCut.length

  for (const pattern of REPLY_CUT_PATTERNS) {
    const match = pattern.exec(textForCut)
    if (match && typeof match.index === 'number' && match.index < cutIndex) {
      cutIndex = match.index
    }
  }

  if (cutIndex < textForCut.length) {
    const keptText = textForCut.slice(0, cutIndex).trim()
    if (keptText) {
      return keptText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('')
    }
    return ''
  }

  return result
}

function stripSignatureBlock(html: string): string {
  const text = stripHtmlToText(html)
  const signatureIndex = text.search(/\n--\s*\n/)
  if (signatureIndex <= 0) return html

  const kept = text.slice(0, signatureIndex).trim()
  if (!kept) return ''

  return kept
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function normalizeChatterDisplayBody(html: string): string {
  if (!html.trim()) return ''

  let normalized = stripEmailQuoteBlocks(html)
  normalized = stripSignatureBlock(normalized)

  return normalized.trim()
}

export function normalizeChatterDisplaySnippet(html: string, maxLength = 120): string {
  const normalized = normalizeChatterDisplayBody(html)
  const text = stripHtmlToText(normalized).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}
