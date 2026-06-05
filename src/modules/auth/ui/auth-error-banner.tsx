'use client'

import { useSearchParams } from 'next/navigation'

import { portal } from '@/content/portal'

const ERROR_KEYS = [
  'oauth_not_configured',
  'oauth_failed',
  'auth_callback',
] as const

type AuthErrorKey = (typeof ERROR_KEYS)[number]

function isAuthErrorKey(value: string | null): value is AuthErrorKey {
  return ERROR_KEYS.includes(value as AuthErrorKey)
}

export function AuthErrorBanner() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  if (!isAuthErrorKey(error)) return null

  return (
    <p
      role="alert"
      className="alert-on-dark mb-5"
    >
      {portal.login.errors[error]}
    </p>
  )
}
