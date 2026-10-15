type DirectoryEmailActionResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

const KNOWN_ERROR_MESSAGES = new Set([
  'unauthorized',
  'NOT_FOUND',
  'NO_AUTH_ACCOUNT',
  'ACCOUNT_ARCHIVED',
  'PASSWORD_RESET_FAILED',
  'EMAIL_RATE_LIMIT',
  'RESEND_NOT_CONFIGURED',
  'INVITE_EMAIL_DISABLED',
])

/** Traduce errores de envío/reseteo de acceso a mensajes legibles para el staff; lo no reconocido se devuelve genérico y el detalle va al log. */
export function mapDirectoryEmailError(error: unknown): DirectoryEmailActionResult {
  // El detalle técnico (Resend, base de datos...) se queda en el log del servidor.
  if (
    error instanceof Error &&
    !KNOWN_ERROR_MESSAGES.has(error.message)
  ) {
    console.error('[directory] error de envío/acceso no reconocido', error)
  }
  if (error instanceof Error && error.message === 'unauthorized') {
    return { ok: false, error: 'unauthorized' }
  }
  if (error instanceof Error && error.message === 'NOT_FOUND') {
    return { ok: false, error: 'not_found' }
  }
  if (error instanceof Error && error.message === 'NO_AUTH_ACCOUNT') {
    return {
      ok: false,
      error: 'unknown',
      message:
        'Este cliente no tiene cuenta de acceso vinculada. Contacta con soporte.',
    }
  }
  if (error instanceof Error && error.message === 'ACCOUNT_ARCHIVED') {
    return {
      ok: false,
      error: 'unknown',
      message:
        'Esta cuenta está archivada. Reactívala antes de reenviar el acceso.',
    }
  }
  if (error instanceof Error && error.message === 'PASSWORD_RESET_FAILED') {
    return {
      ok: false,
      error: 'unknown',
      message: 'No pudimos invalidar la contraseña actual. Inténtalo de nuevo.',
    }
  }
  if (error instanceof Error && error.message === 'EMAIL_RATE_LIMIT') {
    return {
      ok: false,
      error: 'unknown',
      message:
        'Supabase ha limitado el envío de correos. Espera unos minutos o activa PORTAL_SKIP_CLIENT_INVITE_EMAIL=true en desarrollo.',
    }
  }
  if (error instanceof Error && error.message === 'RESEND_NOT_CONFIGURED') {
    return {
      ok: false,
      error: 'unknown',
      message:
        'Resend no está bien configurado. Revisa RESEND_API_KEY y RESEND_FROM_EMAIL en .env.local y reinicia pnpm dev.',
    }
  }
  if (error instanceof Error && error.message === 'INVITE_EMAIL_DISABLED') {
    return {
      ok: false,
      error: 'unknown',
      message:
        'El envío de correos está desactivado (PORTAL_SKIP_CLIENT_INVITE_EMAIL). Configura Resend o desactiva esa variable.',
    }
  }
  if (
    error instanceof Error &&
    (error.message.includes('Resend') ||
      error.message.includes('resend') ||
      error.message.includes('API key') ||
      error.message.includes('onboarding@resend.dev') ||
      error.message.includes('RESEND_INVITE_OVERRIDE_TO'))
  ) {
    return {
      ok: false,
      error: 'unknown',
      message:
        'No se pudo enviar el correo. Revisa la configuración de Resend e inténtalo de nuevo.',
    }
  }
  return {
    ok: false,
    error: 'unknown',
    message: 'No se pudo completar la operación. Inténtalo de nuevo.',
  }
}
