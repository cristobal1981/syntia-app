'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { portal } from '@/content/portal'
import { AuthErrorBanner } from '@/src/modules/auth/ui/auth-error-banner'
import { authTextLinkClassName } from '@/src/modules/auth/ui/auth-field-styles'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import { LoginForm } from '@/src/modules/auth/ui/login-form'

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? '/proximamente'

export function LoginScreen() {
  return (
    <AuthPageShell
      title={portal.login.title}
      description={portal.login.description}
      footer={
        <Link href={landingUrl} className={authTextLinkClassName}>
          <ArrowLeft className="size-4" aria-hidden />
          {portal.login.backToSiteLabel}
        </Link>
      }
    >
      <AuthFormPanel>
        <Suspense fallback={null}>
          <AuthErrorBanner />
        </Suspense>
        <LoginForm />
      </AuthFormPanel>
    </AuthPageShell>
  )
}
