import {
  isChatterHtmlEmpty,
} from '@/src/modules/portal/domain/filter-portal-messages'
import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/domain/sanitize-chatter-html.server'

const ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Un enlace a la propia instancia de Odoo (o a su cliente web) no sirve al
 * cliente y revela infraestructura interna: se quita el enlace y se conserva
 * el texto.
 */
function stripInternalOdooLinks(html: string, odooBaseUrl: string | undefined): string {
  const odooHost = odooBaseUrl ? hostOf(odooBaseUrl) : null

  return html.replace(ANCHOR_PATTERN, (full, attrs: string, text: string) => {
    const href = /href="([^"]*)"/i.exec(attrs)?.[1] ?? ''
    const host = hostOf(href)
    const isOdooHost = Boolean(odooHost && host === odooHost)
    const isOdooPath = /\/(?:web|odoo)(?:[#/?]|$)/i.test(href)
    return isOdooHost || isOdooPath ? text : full
  })
}

/**
 * Descripción de una tarea de Odoo lista para mostrar al cliente: HTML
 * saneado con la lista blanca del chatter, sin enlaces internos de Odoo.
 * `null` si no hay texto que enseñar.
 */
export function prepareTramiteDescription(
  rawHtml: unknown,
  odooBaseUrl: string | undefined
): string | null {
  if (typeof rawHtml !== 'string' || !rawHtml.trim()) return null

  const html = stripInternalOdooLinks(
    prepareChatterHtmlForDisplay(rawHtml),
    odooBaseUrl
  )
  return isChatterHtmlEmpty(html) ? null : html
}
