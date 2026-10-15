import {
  EMAIL_COLORES,
  EMAIL_FUENTE_TEXTO,
  EMAIL_TEMAS,
  type EmailTemaId,
} from '@/src/modules/email/domain/brand'
import { escapeHtml as esc } from '@/src/modules/email/domain/escape-html'
import type {
  EmailBlock,
  EmailCajaBlock,
  EmailCtaBlock,
  EmailHtmlBlock,
  EmailParrafoBlock,
} from '@/src/modules/email/domain/blocks'

/**
 * Contrato de escape: los campos de TEXTO (`icono`, `label` del botón) se
 * escapan aquí; los campos que son HTML por diseño (`parrafo.html`,
 * `caja.textoLibre`, `html.html`) se emiten tal cual y el llamador es quien
 * debe escapar los datos de personas que meta en ellos.
 */

/** Solo http(s) y mailto; cualquier otra cosa (javascript:, data:...) no genera enlace. */
function safeHref(href: string): string | null {
  const value = href.trim()
  if (!/^(?:https?:\/\/|mailto:)[^\s<>`\u0000-\u001F\u007F]+$/i.test(value)) return null
  return esc(value)
}

function resolveTema(tema?: EmailTemaId) {
  return EMAIL_TEMAS[tema ?? 'info'] ?? EMAIL_TEMAS.info
}

function renderParrafo(b: EmailParrafoBlock): string {
  return `<p style="margin: 0 0 16px 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; line-height: 1.6; color: ${EMAIL_COLORES.textoPrincipal};">${b.html}</p>`
}

function renderCaja(b: EmailCajaBlock): string {
  const t = resolveTema(b.tema)
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr><td style="background-color: ${t.fondo}; border-left: 4px solid ${t.borde}; border-radius: 4px; padding: 14px 20px; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 14px; color: ${t.texto};">
        ${b.icono ? `${esc(b.icono)} ` : ''}${b.textoLibre}
      </td></tr>
    </table>`
}

function renderCta(b: EmailCtaBlock): string {
  const href = safeHref(b.href)
  // Sin destino seguro no hay botón: mejor omitirlo que enviar un enlace roto o peligroso.
  if (!href) return ''
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 24px 0;">
      <tr>
        <td style="border-radius: 8px; background-color: ${EMAIL_COLORES.verdeSyntia};">
          <a href="${href}" style="display: inline-block; padding: 12px 22px; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; font-weight: 600; color: ${EMAIL_COLORES.verdeNoche}; text-decoration: none;">${esc(b.label)}</a>
        </td>
      </tr>
    </table>`
}

function renderHtml(b: EmailHtmlBlock): string {
  return b.html || ''
}

/** Despacha por `tipo`; un tipo desconocido se omite (cadena vacía) en vez de romper el email. */
export function renderEmailBlock(b: EmailBlock): string {
  switch (b.tipo) {
    case 'parrafo':
      return renderParrafo(b)
    case 'caja':
      return renderCaja(b)
    case 'cta':
      return renderCta(b)
    case 'html':
      return renderHtml(b)
    default:
      return ''
  }
}
