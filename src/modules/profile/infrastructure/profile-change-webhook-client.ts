import type { ProfileChangePayload } from '@/src/modules/profile/domain/types'

function isStubMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_FORM_SUBMIT_STUB === 'true' ||
    !process.env.PROFILE_CHANGE_WEBHOOK_URL
  )
}

export async function sendProfileChangeRequest(
  payload: ProfileChangePayload
): Promise<void> {
  if (isStubMode()) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[profile-change stub]', payload)
    }
    return
  }

  const url = process.env.PROFILE_CHANGE_WEBHOOK_URL!
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
