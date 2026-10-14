import { normalizeChatterDisplayBody } from '@/src/modules/portal/domain/normalize-chatter-display-body'

/**
 * Sanitizador de HTML del chatter (lista blanca de etiquetas, sin atributos
 * salvo el href de los enlaces, que lleva siempre rel/target fijos). Se aplica
 * al guardar y al mostrar; los tags no permitidos se eliminan conservando su
 * texto. Es un filtro por lista blanca, no un parser: por eso solo se emiten
 * etiquetas reconstruidas por nosotros, nunca atributos copiados del origen.
 */
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

/**
 * Un enlace solo se conserva si el href EMPIEZA por un esquema permitido
 * escrito en claro. Así una entidad (`&#106;avascript:`, `javascript&colon;`),
 * una ruta relativa o cualquier otro esquema se descartan antes de que el
 * navegador pueda decodificarlos; además se rechazan espacios, caracteres de
 * control y `<`, `>` o comillas invertidas.
 */
const SAFE_HREF_PATTERN = /^(?:https?:\/\/|mailto:)[^\s<>`\u0000-\u001F\u007F]+$/i

function removeDangerousBlocks(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
}

/**
 * Valor del primer atributo `href`, leyendo los atributos de uno en uno para
 * que un `href=...` dentro del valor de otro atributo (p. ej. `title`) no se
 * confunda con el enlace real.
 */
function readHref(attrs: string): string | null {
  const attributePattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+))/g
  for (const match of attrs.matchAll(attributePattern)) {
    if (match[1].toLowerCase() === 'href') {
      return match[2] ?? match[3] ?? match[4] ?? null
    }
  }
  return null
}

/**
 * Devuelve la etiqueta `<a>` reconstruida o `null` si el enlace no es seguro.
 * `rel` y `target` son siempre los fijos: lo que traiga el original se ignora
 * (copiarlo permitía inyectar atributos con comillas).
 */
function buildSafeAnchor(attrs: string): string | null {
  const href = readHref(attrs)
  if (!href || !SAFE_HREF_PATTERN.test(href)) return null

  try {
    const url = new URL(href)
    if (!SAFE_LINK_PROTOCOLS.includes(url.protocol)) return null
  } catch {
    return null
  }

  const safeHref = href.replace(/"/g, '%22')
  return `<a href="${safeHref}" rel="noopener noreferrer" target="_blank">`
}

function sanitizeHtmlTags(html: string): string {
  // Cierres </a> huérfanos: solo se emite el cierre de un enlace que se abrió.
  let openAnchors = 0

  return html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase()
    if (!CHATTER_ALLOWED_TAGS.has(tag)) return ''

    if (match.startsWith('</')) {
      if (tag === 'a') {
        if (openAnchors === 0) return ''
        openAnchors -= 1
      }
      return `</${tag}>`
    }

    if (tag === 'br') return '<br>'

    if (tag === 'a') {
      const anchor = buildSafeAnchor(rawAttrs)
      if (anchor) openAnchors += 1
      return anchor ?? ''
    }

    return `<${tag}>`
  })
}

export function sanitizeChatterHtml(html: string): string {
  const cleaned = removeDangerousBlocks(html)
  return sanitizeHtmlTags(cleaned)
}

export function prepareChatterHtmlForDisplay(body: string): string {
  const normalized = normalizeChatterDisplayBody(body)
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<\/p>\s*<p[^>]*>/gi, '</p><p>')

  return sanitizeChatterHtml(normalized)
}
