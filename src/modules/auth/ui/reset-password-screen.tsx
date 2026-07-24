'use client'

import { Suspense, useState } from 'react'

import { portal } from '@/content/portal'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import {
  ResetPasswordForm,
  type ResetPasswordFormStatus,
} from '@/src/modules/auth/ui/reset-password-form'

export function ResetPasswordScreen() {
  const [status, setStatus] = useState<ResetPasswordFormStatus>('loading')
  const unavailable = status === 'invalid'

  return (
    <AuthPageShell
      title={
        unavailable
          ? portal.reset.unavailable.eyebrow
          : portal.reset.title
      }
      description={unavailable ? undefined : portal.reset.description}
      logoHref="/login"
    >
      <AuthFormPanel>
        <Suspense
          fallback={
            <p className="text-sm text-muted-on-dark">
              {portal.reset.verifyingLink}
            </p>
          }
        >
          <ResetPasswordForm onStatusChange={setStatus} />
        </Suspense>
      </AuthFormPanel>
    </AuthPageShell>
  )
}
