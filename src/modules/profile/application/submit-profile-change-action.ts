'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  parseProfileChangeRequestBody,
  submitProfileChange,
} from '@/src/modules/profile/application/submit-profile-change'
import type { ProfileChangeResult } from '@/src/modules/profile/domain/types'

export async function submitProfileChangeAction(
  rawBody: unknown
): Promise<ProfileChangeResult> {
  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'unauthorized' }
  }

  const body = parseProfileChangeRequestBody(rawBody)
  if (!body) {
    return {
      ok: false,
      error: 'validation',
      fieldErrors: { _form: 'Solicitud inválida.' },
    }
  }

  const result = await submitProfileChange(session.user, body)

  if (!result.ok && result.error === 'unknown') {
    console.error('[profile-change] unexpected failure while submitting request')
  }

  return result
}
