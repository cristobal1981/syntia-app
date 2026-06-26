export function isPortalDarkThemeEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_PORTAL_DARK_THEME_ENABLED?.trim().toLowerCase()

  if (value === 'true') return true
  if (value === 'false') return false

  return process.env.NODE_ENV === 'development'
}
