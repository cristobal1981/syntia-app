import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'

type ClientAccessEmailParams = {
  accessLink: string
  clientEmail: string
  purpose: 'invite' | 'recovery'
  isOverrideRecipient: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildClientAccessEmail({
  accessLink,
  clientEmail,
  purpose,
  isOverrideRecipient,
}: ClientAccessEmailParams) {
  const subject =
    purpose === 'invite'
      ? 'Invitación al portal de Syntia'
      : 'Restablece tu acceso al portal de Syntia'

  const body =
    purpose === 'invite'
      ? 'Te hemos dado acceso al portal de Syntia, un portal interno desarrollado por tenaasesores donde podrás ver el estado de tus trámites. Pulsa el botón para activar tu cuenta y elegir contraseña.'
      : 'Hemos generado un enlace seguro para que actives o restablezcas tu acceso al portal de Syntia.'

  const cta = purpose === 'invite' ? 'Activar acceso al portal' : 'Restablecer acceso'

  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de prueba: enlace generado para <strong>${escapeHtml(clientEmail)}</strong>.`,
    })
  }

  bloques.push({ tipo: 'parrafo', html: escapeHtml(body) })
  bloques.push({ tipo: 'cta', href: accessLink, label: cta })
  bloques.push({
    tipo: 'html',
    html: `<p style="margin: 0 0 16px 0; font-family: 'Archivo', Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #5B6E6C;">Si el botón no funciona, copia y pega esta URL en el navegador:<br><span style="word-break:break-all; font-size: 11px;">${escapeHtml(accessLink)}</span></p>`,
  })
  bloques.push({
    tipo: 'parrafo',
    html: '<span style="color:#5B6E6C;font-size:14px;">Si no esperabas este correo, puedes ignorarlo.</span>',
  })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo: 'Hola,',
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const text = [
    'Hola,',
    isOverrideRecipient
      ? `Correo de prueba: enlace generado para ${clientEmail}.`
      : '',
    body,
    accessLink,
    '',
    'Si no esperabas este correo, puedes ignorarlo.',
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
