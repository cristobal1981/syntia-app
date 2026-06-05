'use client'

import { Suspense } from 'react'

import { portal } from '@/content/portal'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import { ResetPasswordForm } from '@/src/modules/auth/ui/reset-password-form'

export function ResetPasswordScreen() {
  return (
    <AuthPageShell
      title={portal.reset.title}
      description={portal.reset.description}
      logoHref="/login"
    >
      <AuthFormPanel>
        <Suspense fallback={<p className="text-sm text-muted-on-dark">{portal.reset.verifyingLink}</p>}>
          <ResetPasswordForm />
        </Suspense>
      </AuthFormPanel>
    </AuthPageShell>
  )
}
