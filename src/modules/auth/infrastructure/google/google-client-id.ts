export function getGoogleClientId(): string | undefined {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  return clientId?.trim() || undefined
}
