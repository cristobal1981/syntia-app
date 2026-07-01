import { getCachedPendingSignaturesSnapshot } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'

export async function countPendingSignaturesForPartner(
  partnerId: number
): Promise<number> {
  const snapshot = await getCachedPendingSignaturesSnapshot(partnerId)
  return snapshot.requests.length
}
