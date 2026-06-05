'use client'

import { portal } from '@/content/portal'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import { RequestPasswordResetForm } from '@/src/modules/auth/ui/request-password-reset-form'

export function RecoveryScreen() {
  return (
    <AuthPageShell
      title={portal.recovery.title}
      description={portal.recovery.description}
      logoHref="/login"
    >
      <AuthFormPanel>
        <RequestPasswordResetForm />
      </AuthFormPanel>
    </AuthPageShell>
  )
}
