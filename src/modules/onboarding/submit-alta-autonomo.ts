import {
  validateAltaAutonomoSubmission,
  type AltaAutonomoSubmission,
} from '@/lib/onboarding/validate-submission'
import { createAltaAutonomoInOdoo } from '@/src/modules/onboarding/odoo-alta-autonomo-repository'
import { markOnboardingFormAccessTokenUsed } from '@/src/modules/onboarding/onboarding-token-repository.supabase'
import { validateOnboardingToken } from '@/src/modules/onboarding/validate-onboarding-token'
import {
  ODOO_ERROR,
  resolveOdooErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

export type SubmitAltaAutonomoResult =
  | { ok: true; odooRecordId: number }
  | {
      ok: false
      error:
        | 'validation'
        | 'not_found'
        | 'expired'
        | 'used'
        | 'revoked'
        | 'odoo_unavailable'
        | 'odoo_rate_limited'
        | 'unknown'
      fieldErrors?: Record<string, string>
    }

type SubmitPayloadInput = {
  token: string
  payload: unknown
}

function ensureRecipientEmailMatches(
  tokenRecipientEmail: string | null,
  submission: AltaAutonomoSubmission
): SubmitAltaAutonomoResult | null {
  if (!tokenRecipientEmail) {
    return null
  }

  if (tokenRecipientEmail.toLowerCase() === submission.email.toLowerCase()) {
    return null
  }

  return {
    ok: false,
    error: 'validation',
    fieldErrors: {
      email: 'El correo del formulario no coincide con el enlace recibido.',
    },
  }
}

export async function submitAltaAutonomo(
  input: SubmitPayloadInput
): Promise<SubmitAltaAutonomoResult> {
  const tokenValidation = await validateOnboardingToken({ token: input.token })
  if (!tokenValidation.ok) {
    return { ok: false, error: tokenValidation.error }
  }

  const submissionValidation = validateAltaAutonomoSubmission(input.payload)
  if (!submissionValidation.ok) {
    return {
      ok: false,
      error: 'validation',
      fieldErrors: submissionValidation.fieldErrors,
    }
  }

  const emailConsistencyResult = ensureRecipientEmailMatches(
    tokenValidation.token.recipient_email,
    submissionValidation.data
  )
  if (emailConsistencyResult) {
    return emailConsistencyResult
  }

  try {
    const odooRecordId = await createAltaAutonomoInOdoo({
      token: tokenValidation.token.token,
      recipientEmail: tokenValidation.token.recipient_email,
      submission: submissionValidation.data,
    })

    const markedUsed = await markOnboardingFormAccessTokenUsed(
      tokenValidation.token.token
    )
    if (!markedUsed) {
      return { ok: false, error: 'unknown' }
    }

    return { ok: true, odooRecordId }
    } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_ALTA_AUTONOMO_CREATE_FAILED') {
        return { ok: false, error: 'odoo_unavailable' }
      }
      if (error.message === 'ODOO_COUNTRY_NOT_FOUND') {
        return {
          ok: false,
          error: 'validation',
          fieldErrors: { pais: 'No hemos podido identificar el pais indicado.' },
        }
      }
      if (error.message === 'ODOO_STATE_NOT_FOUND') {
        return {
          ok: false,
          error: 'validation',
          fieldErrors: { provincia: 'No hemos podido identificar la provincia indicada.' },
        }
      }
      if (
        error.message === ODOO_ERROR.NOT_CONFIGURED ||
        error.message === ODOO_ERROR.REQUEST_FAILED
      ) {
        return { ok: false, error: resolveOdooErrorCode(error) }
      }
      if (error.message === ODOO_ERROR.RATE_LIMITED) {
        return { ok: false, error: 'odoo_rate_limited' }
      }
    }
    console.error('[onboarding] unexpected submit error', error)
    return { ok: false, error: 'unknown' }
  }
}
