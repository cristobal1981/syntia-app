import { onboarding } from '@/content/onboarding'

/** Formulario de alta en la landing de Tena (no en el portal Syntia). */
const DEFAULT_ONBOARDING_LANDING_URL = 'https://tenaasesores.es'

export function resolveLandingBaseUrl(): string | null {
  const value =
    process.env.NEXT_PUBLIC_ONBOARDING_LANDING_URL?.trim() ||
    DEFAULT_ONBOARDING_LANDING_URL
  return value.replace(/\/$/, '')
}

export function buildOnboardingAccessUrl(token: string): string | null {
  const base = resolveLandingBaseUrl()
  if (!base) return null
  return `${base}${onboarding.altaAutonomo.path}/${token}`
}
