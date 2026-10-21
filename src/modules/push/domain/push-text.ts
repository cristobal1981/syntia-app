import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/domain/sanitize-chatter-html.server'

const MAX_PREVIEW_LENGTH = 110

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

/**
 * Texto plano y corto de un mensaje del chatter para el cuerpo de la
 * notificación: se sanea igual que al mostrarlo (sin citas de correo ni HTML
 * peligroso), se quitan las etiquetas y se recorta. `null` si no queda texto.
 */
export function htmlToPushPreview(html: unknown): string | null {
  if (typeof html !== 'string' || !html.trim()) return null

  const text = prepareChatterHtmlForDisplay(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  return text.length > MAX_PREVIEW_LENGTH
    ? `${text.slice(0, MAX_PREVIEW_LENGTH - 1).trimEnd()}…`
    : text
}
