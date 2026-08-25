'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { portal } from '@/content/portal'
import { MarketingButton } from '@/components/ui/marketing-button'
import { finalizeRecoverySessionAction } from '@/src/modules/auth/application/finalize-recovery-session'
import {
  parseRecoveryOtpType,
  verifyRecoveryLink as establishRecoverySessionFromUrl,
} from '@/src/modules/auth/application/verify-recovery-link'
import {
  getPasswordRequirementStatus,
  isStrongPassword,
} from '@/src/modules/auth/domain/password-policy'
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from '@/src/modules/auth/infrastructure/supabase/client'
import { PasswordInput } from '@/src/modules/auth/ui/password-input'
import { PasswordRequirementsChecklist } from '@/src/modules/auth/ui/password-requirements-checklist'
import { ResetLinkUnavailable } from '@/src/modules/auth/ui/reset-link-unavailable'
import { markPortalEntryPending } from '@/src/modules/portal/ui/portal-entry-loading-context'

type ResetStatus = 'loading' | 'ready' | 'invalid' | 'not_configured'

export type ResetPasswordFormStatus = ResetStatus

type ResetPasswordFormProps = {
  onStatusChange?: (status: ResetPasswordFormStatus) => void
}

const passwordFieldClassName =
  'input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base transition-[border-color,box-shadow] duration-200 focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_rgba(1,222,162,0.25)]'

function parseAuthHashParams(): {
  access_token?: string
  refresh_token?: string
  type?: string
} {
  if (typeof window === 'undefined') return {}
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return {}
  const params = new URLSearchParams(raw)
  return {
    access_token: params.get('access_token') ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    type: params.get('type') ?? undefined,
  }
}

export function ResetPasswordForm({ onStatusChange }: ResetPasswordFormProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<ResetStatus>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mismatchAttempted, setMismatchAttempted] = useState(false)
  const [pending, setPending] = useState(false)

  const requirementStatus = useMemo(
    () => getPasswordRequirementStatus(password),
    [password]
  )

  const showMismatch = mismatchAttempted && password !== confirmPassword
  const errorMessage = showMismatch
    ? portal.reset.errors.mismatch
    : submitError
  const hasFieldError = Boolean(errorMessage)

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  useEffect(() => {
    let cancelled = false

    async function bootstrapRecoverySession() {
      if (!isSupabaseBrowserConfigured()) {
        setStatus('not_configured')
        return
      }

      const supabase = createSupabaseBrowserClient()
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const otpType = parseRecoveryOtpType(searchParams.get('type'))
      const hash = parseAuthHashParams()

      const verified = await establishRecoverySessionFromUrl(supabase, {
        tokenHash,
        otpType,
        code,
        accessToken: hash.access_token,
        refreshToken: hash.refresh_token,
      })

      if (cancelled) return

      if (verified.ok) {
        setStatus('ready')
        if (tokenHash || code || hash.access_token) {
          router.replace('/login/restablecer')
        }
        return
      }

      setStatus('invalid')
    }

    bootstrapRecoverySession().catch(() => {
      if (!cancelled) setStatus('invalid')
    })

    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setMismatchAttempted(false)
    setPending(true)

    if (!isStrongPassword(password)) {
      setPending(false)
      return
    }

    if (password !== confirmPassword) {
      setMismatchAttempted(true)
      setPending(false)
      return
    }

    if (!isSupabaseBrowserConfigured()) {
      setSubmitError(portal.reset.errors.not_configured)
      setPending(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      const message = error.message.toLowerCase()
      const isSamePassword =
        error.code === 'same_password' ||
        (error.status === 422 &&
          (message.includes('same_password') ||
            message.includes('different from the old password') ||
            message.includes('different password')))
      setSubmitError(
        isSamePassword
          ? portal.reset.errors.same_password
          : portal.reset.errors.unknown
      )
      setPending(false)
      return
    }

    markPortalEntryPending()
    const result = await finalizeRecoverySessionAction()
    if (!result.ok && result.error === 'account_disabled') {
      setSubmitError(portal.reset.errors.account_disabled)
    }
    setPending(false)
  }

  if (status === 'loading') {
    return (
      <p className="text-sm text-muted-on-dark">{portal.reset.verifyingLink}</p>
    )
  }

  if (status === 'invalid') {
    return <ResetLinkUnavailable />
  }

  if (status === 'not_configured') {
    return (
      <p role="alert" className="alert-on-dark">
        {portal.reset.errors.not_configured}
      </p>
    )
  }

  const canSubmit =
    isStrongPassword(password) && confirmPassword.length > 0 && !pending

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
        >
          {portal.reset.passwordLabel}
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => {
            setSubmitError(null)
            setMismatchAttempted(false)
            setPassword(event.target.value)
          }}
          aria-invalid={hasFieldError}
          className={passwordFieldClassName}
        />
        <PasswordRequirementsChecklist status={requirementStatus} />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirmPassword"
          className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
        >
          {portal.reset.confirmPasswordLabel}
        </label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => {
            setSubmitError(null)
            setMismatchAttempted(false)
            setConfirmPassword(event.target.value)
          }}
          aria-invalid={hasFieldError}
          className={passwordFieldClassName}
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="alert-on-dark">
          {errorMessage}
        </p>
      ) : null}

      <MarketingButton
        type="submit"
        marketingVariant="primary"
        className="h-12 w-full rounded-lg text-base font-semibold"
        disabled={!canSubmit}
        aria-busy={pending}
      >
        {pending ? 'Guardando…' : portal.reset.submitLabel}
      </MarketingButton>

      <p className="text-center text-sm text-muted-on-dark">
        <Link href="/login" className="text-primary hover:underline">
          {portal.reset.backToLoginLabel}
        </Link>
      </p>
    </form>
  )
}
