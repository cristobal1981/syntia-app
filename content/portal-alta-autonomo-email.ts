import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'

type AltaAutonomoAccessEmailParams = {
  accessLink: string
  clientEmail: string
  clientFirstName?: string | null
  expiresAt: string
  isOverrideRecipient: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatAltaAutonomoExpiryLabel(expiresAt: string): string {
  const date = new Date(expiresAt)
  if (!Number.isFinite(date.getTime())) return expiresAt

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function resolveGreetingFirstName(firstName?: string | null): string | null {
  const cleaned = firstName?.trim().split(/\s+/)[0] ?? ''
  if (!cleaned) return null
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function buildAltaAutonomoAccessEmail({
  accessLink,
  clientEmail,
  clientFirstName,
  expiresAt,
  isOverrideRecipient,
}: AltaAutonomoAccessEmailParams) {
  const subject = 'Completa tu solicitud de alta de autónomo'
  const expiresLabel = formatAltaAutonomoExpiryLabel(expiresAt)
  const firstName = resolveGreetingFirstName(clientFirstName)
  const saludo = firstName ? `Hola, ${firstName}` : 'Hola'

  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de <strong>prueba</strong>: el enlace real se generó para <strong>${escapeHtml(clientEmail)}</strong>, pero este envío se redirigió por <code>RESEND_INVITE_OVERRIDE_TO</code>.`,
    })
  }

  bloques.push({
    tipo: 'parrafo',
    html: 'Tu asesoría te ha preparado un formulario para la solicitud de alta de autónomo. Pulsa el botón para abrirlo y completarlo con tus datos.',
  })
  bloques.push({
    tipo: 'caja',
    tema: 'info',
    textoLibre: `Tienes hasta el <strong>${escapeHtml(expiresLabel)}</strong> para enviarlo. Pasada esa fecha el enlace caduca y no podrás usarlo.`,
  })
  bloques.push({
    tipo: 'cta',
    href: accessLink,
    label: 'Abrir formulario de alta',
  })
  bloques.push({
    tipo: 'html',
    html: `<p style="margin: 0 0 16px 0; font-family: 'Archivo', Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #5B6E6C;">Si el botón no funciona, copia y pega esta URL en el navegador:<br><span style="word-break:break-all; font-size: 11px;">${escapeHtml(accessLink)}</span></p>`,
  })
  bloques.push({
    tipo: 'html',
    html: `<p style="margin: 0 0 16px 0; font-family: 'Archivo', Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.55; color: #8A6D1D;">Este formulario es <strong>único y personal</strong>. No lo compartas con nadie: el enlace solo sirve para ti y deja de ser válido cuando lo completes o caduque.</p>`,
  })
  bloques.push({
    tipo: 'parrafo',
    html: '<span style="color:#5B6E6C;font-size:14px;">Si no esperabas este correo, puedes ignorarlo o avisar a tu asesoría.</span>',
  })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo,
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const text = [
    saludo,
    isOverrideRecipient
      ? `Correo de prueba: enlace generado para ${clientEmail} (redirigido por RESEND_INVITE_OVERRIDE_TO).`
      : '',
    'Tu asesoría te ha preparado un formulario para la solicitud de alta de autónomo.',
    `Tienes hasta el ${expiresLabel} para enviarlo. Pasada esa fecha el enlace caduca.`,
    accessLink,
    '',
    'Este formulario es único y personal. No lo compartas con nadie.',
    '',
    'Si no esperabas este correo, puedes ignorarlo o avisar a tu asesoría.',
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
