const inFlight = new Map<string, Promise<unknown>>()

export function dedupedServerAction<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = fn().finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}

export function serverActionDedupKey(
  action: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const parts = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key] ?? ''}`)
  return `${action}:${parts.join('&')}`
}
