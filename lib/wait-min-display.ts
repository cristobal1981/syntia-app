export async function waitRemainingMinDuration(
  startedAt: number,
  minMs: number
): Promise<void> {
  const remaining = minMs - (Date.now() - startedAt)
  if (remaining <= 0) return
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining)
  })
}
