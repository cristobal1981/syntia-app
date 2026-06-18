import type { ProfileChangePayload } from '@/src/modules/profile/domain/types'

export async function sendProfileChangeRequest(
  payload: ProfileChangePayload
): Promise<void> {
  const url = process.env.PROFILE_CHANGE_WEBHOOK_URL?.trim()
  if (!url) {
    throw new Error('PROFILE_CHANGE_WEBHOOK_NOT_CONFIGURED')
  }

  const secret = process.env.PROFILE_CHANGE_WEBHOOK_SECRET

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-Webhook-Secret': secret } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Profile change webhook failed: ${response.status}`)
  }
}
