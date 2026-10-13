function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const REPLY_CUT_PATTERNS = [
  /\bel\s+.+?\s+escribi[oó]:/i,
  // Outlook en español también cita como "Al {fecha} ... escribió--" (sin
  // dos puntos): cualquier "escribió" pegado a ":"/"-" es casi siempre
  // este marcador de cita, venga con "El" o "Al" delante.
  /\bescribi[oó]\s*[-:]/i,
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
    if (!match || typeof match.index !== 'number') continue

    // El marcador de cita ("escribió:", "wrote:"...) suele venir precedido
    // en la misma línea por la fecha y el remitente citados ("Al {fecha}
    // {remitente} <email>") — se corta desde el principio de esa línea,
    // no solo desde la palabra que hizo match, para no dejar ese trozo
    // suelto delante.
    const lineStart = textForCut.lastIndexOf('\n', match.index) + 1
    if (lineStart < cutIndex) {
      cutIndex = lineStart
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

/**
 * El disclaimer legal/ecológico que Outlook/Gmail añaden a las firmas de
 * correo de la gestoría no tiene ningún marcador estructural fiable en el
 * HTML (sin clase, sin <hr>, sin delimitador de texto plano) — cortar por
 * "confidencial" o "aviso legal" a secas arriesga borrar un mensaje real de
 * cliente que use esas palabras. La frase del aviso de impresión ecológico
 * sí es lo bastante específica como para no aparecer nunca en una consulta
 * fiscal real; si el texto de la firma cambia algún día, este patrón deja
 * de cortar (falla seguro: no corta nada, no corta de más).
 */
const KNOWN_DISCLAIMER_CUT_PATTERNS = [
  /protejamos el medio ambiente/i,
  /imprima este (correo|email)( electr[oó]nico)? solo si es necesario/i,
] as const

function stripKnownDisclaimerBlock(html: string): string {
  const text = stripHtmlToText(html)
  let cutIndex = text.length

  for (const pattern of KNOWN_DISCLAIMER_CUT_PATTERNS) {
    const match = pattern.exec(text)
    if (match && typeof match.index === 'number' && match.index < cutIndex) {
      cutIndex = match.index
    }
  }

  if (cutIndex >= text.length) return html

  const kept = text.slice(0, cutIndex).trim()
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
  normalized = stripKnownDisclaimerBlock(normalized)

  return normalized.trim()
}

export function normalizeChatterDisplaySnippet(html: string, maxLength = 120): string {
  const normalized = normalizeChatterDisplayBody(html)
  const text = stripHtmlToText(normalized).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}
