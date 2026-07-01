export function isPortalChatterMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PORTAL_CHATTER_MOCK === 'true'
}
