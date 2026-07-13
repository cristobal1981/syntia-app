type ClientAccessEmailParams = {
  accessLink: string
  clientEmail: string
  purpose: 'invite' | 'recovery'
  isOverrideRecipient: boolean
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

  const intro = isOverrideRecipient
    ? `<p style="margin:0 0 16px;">Correo de prueba: enlace generado para <strong>${clientEmail}</strong>.</p>`
    : ''

  const body =
    purpose === 'invite'
      ? 'Te hemos dado acceso al portal de Syntia. Pulsa el enlace para activar tu cuenta y elegir contraseña:'
      : 'Hemos generado un enlace seguro para que actives o restablezcas tu acceso al portal de Syntia:'

  const cta = purpose === 'invite' ? 'Activar acceso al portal' : 'Restablecer acceso'

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;">
  <p style="margin:0 0 16px;">Hola,</p>
  ${intro}
  <p style="margin:0 0 16px;">${body}</p>
  <p style="margin:0 0 24px;"><a href="${accessLink}" style="color:#2d6a4f;">${cta}</a></p>
  <p style="margin:0 0 16px;">Si el botón no funciona, copia y pega esta URL en el navegador:</p>
  <p style="margin:0 0 24px;word-break:break-all;">${accessLink}</p>
  <p style="margin:0;color:#666;font-size:14px;">Si no esperabas este correo, puedes ignorarlo.</p>
</body>
</html>`

  const text = [
    'Hola,',
    isOverrideRecipient
      ? `Correo de prueba: enlace generado para ${clientEmail}.`
      : '',
    body,
    accessLink,
    '',
    'Si no esperabas este correo, puedes ignorarlo.',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
