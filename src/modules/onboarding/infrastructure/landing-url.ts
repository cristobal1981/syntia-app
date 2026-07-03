import { onboarding } from '@/content/onboarding'

export function resolveLandingBaseUrl(): string | null {
  const value =
    process.env.NEXT_PUBLIC_LANDING_URL?.trim() ??
    process.env.SITE_URL?.trim() ??
    ''
  if (!value) return null
  return value.replace(/\/$/, '')
}

export function buildOnboardingAccessUrl(token: string): string | null {
  const base = resolveLandingBaseUrl()
  if (!base) return null
  return `${base}${onboarding.altaAutonomo.path}/${token}`
}
