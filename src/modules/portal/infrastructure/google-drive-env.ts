const DEFAULT_PUBLIC_SUBFOLDER_NAMES = ['Pública', 'Publica', 'Documentos públicos']

export function isGoogleDriveServiceAccountConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  )
}

export function getGoogleDrivePublicSubfolderNames(): string[] {
  const raw = process.env.GOOGLE_DRIVE_PUBLIC_SUBFOLDER_NAME?.trim()
  if (!raw) return DEFAULT_PUBLIC_SUBFOLDER_NAMES
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}
