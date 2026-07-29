export type DirectoryEmailActionResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

export function mapDirectoryEmailError(error: unknown): DirectoryEmailActionResult {
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
      message: `No se pudo enviar el correo: ${error.message}`,
    }
  }
  return {
    ok: false,
    error: 'unknown',
    message: error instanceof Error ? error.message : undefined,
  }
}
