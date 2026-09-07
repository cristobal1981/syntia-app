import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'

type LeadContactEmailParams = {
  subject: string
  body: string
  recipientName: string | null
  recipientEmail: string
  isOverrideRecipient: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Texto libre → párrafos, respetando los saltos de línea que escribió el remitente. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => escapeHtml(paragraph).replace(/\n/g, '<br>'))
    .join('')
}

/**
 * Envuelve un mensaje editado a mano (drawer de "Contactar" en
 * /oportunidades) en la plantilla de marca — no decide el copy, solo el
 * envoltorio. Ver `content/portal-client-access-email.ts` para el mismo
 * patrón con contenido fijo.
 */
export function buildLeadContactEmail({
  subject,
  body,
  recipientName,
  recipientEmail,
  isOverrideRecipient,
}: LeadContactEmailParams) {
  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de prueba: mensaje generado para <strong>${escapeHtml(recipientEmail)}</strong>.`,
    })
  }

  bloques.push({ tipo: 'parrafo', html: bodyToHtml(body) })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo: recipientName ? `Hola ${escapeHtml(recipientName)},` : 'Hola,',
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const text = [
    isOverrideRecipient ? `Correo de prueba: mensaje generado para ${recipientEmail}.` : '',
    recipientName ? `Hola ${recipientName},` : 'Hola,',
    body,
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n\n')

  return { subject, html, text }
}
