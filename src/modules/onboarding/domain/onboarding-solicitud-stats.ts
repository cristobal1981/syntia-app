import {
  deriveEmailFailure,
  deriveEmailProgressStep,
} from '@/src/modules/onboarding/domain/onboarding-email-progress'
import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'

export type OnboardingSolicitudStats = {
  pendingClicked: number
  pendingReceived: number
  pendingFailed: number
}

export function buildOnboardingSolicitudStats(
  rows: OnboardingSolicitudRow[]
): OnboardingSolicitudStats {
  let pendingClicked = 0
  let pendingReceived = 0
  let pendingFailed = 0

  for (const row of rows) {
    if (row.status !== 'active') continue

    const timestamps = {
      emailSentAt: row.emailSentAt,
      emailDeliveredAt: row.emailDeliveredAt,
      emailOpenedAt: row.emailOpenedAt,
      emailClickedAt: row.emailClickedAt,
      emailBouncedAt: row.emailBouncedAt,
      emailComplainedAt: row.emailComplainedAt,
    }

    if (deriveEmailFailure(timestamps)) {
      pendingFailed += 1
      continue
    }

    if (deriveEmailProgressStep(timestamps) === 'clicked') {
      pendingClicked += 1
    } else {
      pendingReceived += 1
    }
  }

  return { pendingClicked, pendingReceived, pendingFailed }
}
