'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { portal } from '@/content/portal'
import { AuthErrorBanner } from '@/src/modules/auth/ui/auth-error-banner'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import { DevQuickLogin } from '@/src/modules/auth/ui/dev-quick-login'
import { LoginForm } from '@/src/modules/auth/ui/login-form'

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? '/proximamente'
const showDevQuickLogin =
  process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL

export function LoginScreen() {

  return (
    <AuthPageShell
      title={portal.login.title}
      description={portal.login.description}
      footer={
        <Link
          href={landingUrl}
          className="underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
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

      {showDevQuickLogin ? <DevQuickLogin /> : null}
    </AuthPageShell>
  )
}
