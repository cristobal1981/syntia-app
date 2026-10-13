import { solicitudes } from '@/content/solicitudes'
import type { OnboardingTokenStatus } from '@/src/modules/onboarding/domain/onboarding-token-status'

export function statusLabel(status: OnboardingTokenStatus): string {
  return solicitudes.list.status[status]
}

export function statusClassName(status: OnboardingTokenStatus): string {
  switch (status) {
    case 'active':
      return 'bg-primary/10 text-primary'
    case 'used':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'revoked':
      return 'bg-muted text-muted-foreground'
    case 'expired':
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
  }
}

export function statusRibbonClassName(status: OnboardingTokenStatus): string {
  switch (status) {
    case 'active':
      return ''
    case 'used':
      return 'bg-emerald-600 text-white'
    case 'revoked':
      return 'bg-muted-foreground text-background'
    case 'expired':
      return 'bg-amber-600 text-white'
  }
}
