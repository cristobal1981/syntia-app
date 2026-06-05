'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { portal } from '@/content/portal'
import { listDemoAccounts } from '@/src/modules/auth/infrastructure/mock-auth-repository'
import { AuthErrorBanner } from '@/src/modules/auth/ui/auth-error-banner'
import { AuthFormPanel } from '@/src/modules/auth/ui/auth-form-panel'
import { AuthPageShell } from '@/src/modules/auth/ui/auth-page-shell'
import { LoginForm } from '@/src/modules/auth/ui/login-form'

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? '/proximamente'
const showDemoAccounts = process.env.NODE_ENV === 'development'

export function LoginScreen() {
  const demoAccounts = showDemoAccounts ? listDemoAccounts() : []

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

      {showDemoAccounts ? (
        <div className="mt-5 rounded-xl border border-agua/20 bg-card/30 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-on-dark uppercase">
            {portal.login.demoTitle}
          </p>
          <ul className="mt-2 space-y-1.5 font-mono text-xs text-muted-on-dark">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <span className="text-primary">{account.role}</span>
                <span className="text-on-dark/40"> · </span>
                {account.email}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AuthPageShell>
  )
}
