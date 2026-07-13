import type { ProfileChangeErrorCode } from '@/src/modules/profile/domain/types'

export function mapProfileChangeErrorToHttpStatus(
  error: ProfileChangeErrorCode
): number {
  switch (error) {
    case 'unauthorized':
      return 401
    case 'forbidden':
      return 403
    case 'validation':
      return 400
    case 'not_linked':
      return 422
    case 'odoo_unavailable':
      return 503
    case 'create_failed':
      return 502
    case 'unknown':
      return 500
  }
}
