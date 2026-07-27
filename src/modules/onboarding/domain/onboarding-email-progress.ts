export type EmailProgressStep = 'sent' | 'delivered' | 'opened' | 'clicked'
export type EmailFailure = 'bounced' | 'complained' | null

type EmailTimestamps = {
  emailSentAt: string | null
  emailDeliveredAt: string | null
  emailOpenedAt: string | null
  emailClickedAt: string | null
  emailBouncedAt: string | null
  emailComplainedAt: string | null
}

const STEP_ORDER: { step: EmailProgressStep; key: keyof EmailTimestamps }[] = [
  { step: 'clicked', key: 'emailClickedAt' },
  { step: 'opened', key: 'emailOpenedAt' },
  { step: 'delivered', key: 'emailDeliveredAt' },
  { step: 'sent', key: 'emailSentAt' },
]

export function deriveEmailProgressStep(
  timestamps: EmailTimestamps
): EmailProgressStep | null {
  for (const { step, key } of STEP_ORDER) {
    if (timestamps[key]) return step
  }
  return null
}

export function deriveEmailFailure(timestamps: EmailTimestamps): EmailFailure {
  if (timestamps.emailComplainedAt) return 'complained'
  if (timestamps.emailBouncedAt) return 'bounced'
  return null
}
