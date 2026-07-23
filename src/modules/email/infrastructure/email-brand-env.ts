function stripEnvQuotes(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/** Logo cabecera emails cliente (fondo claro). URL absoluta HTTPS. */
export function getEmailLogoLightUrl(): string | null {
  const url = stripEnvQuotes(process.env.EMAIL_LOGO_LIGHT_URL)
  return url || null
}

/** Logo banner emails informe (fondo verde noche). URL absoluta HTTPS. */
export function getEmailLogoDarkUrl(): string | null {
  const url = stripEnvQuotes(process.env.EMAIL_LOGO_DARK_URL)
  return url || null
}
