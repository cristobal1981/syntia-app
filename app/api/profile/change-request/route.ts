import { NextResponse } from 'next/server'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  parseProfileChangeRequestBody,
  submitProfileChange,
} from '@/src/modules/profile/application/submit-profile-change'
import type { ProfileChangeApiResponse } from '@/src/modules/profile/domain/types'
import { mapProfileChangeErrorToHttpStatus } from '@/src/modules/profile/infrastructure/map-profile-change-http-status'

function jsonResponse(body: ProfileChangeApiResponse, status: number) {
  return NextResponse.json(body, { status })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401)
  }

  let parsedBody: unknown
  try {
    parsedBody = await request.json()
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: 'validation',
        fieldErrors: { _form: 'Solicitud inválida.' },
      },
      400
    )
  }

  const body = parseProfileChangeRequestBody(parsedBody)
  if (!body) {
    return jsonResponse(
      {
        ok: false,
        error: 'validation',
        fieldErrors: { _form: 'Solicitud inválida.' },
      },
      400
    )
  }

  const result = await submitProfileChange(session.user, body)

  if (result.ok) {
    return jsonResponse(result, 200)
  }

  const status = mapProfileChangeErrorToHttpStatus(result.error)
  if (result.error === 'unknown') {
    console.error('[profile-change] unexpected failure while submitting request')
  }

  return jsonResponse(result, status)
}
