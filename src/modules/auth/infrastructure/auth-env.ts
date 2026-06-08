export function isAuthStubEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_STUB === 'true'
}
