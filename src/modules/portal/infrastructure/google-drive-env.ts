export function isGoogleDriveServiceAccountConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  )
}
