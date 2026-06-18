'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { portal } from '@/content/portal'
import { Input } from '@/components/ui/input'
import { MarketingButton } from '@/components/ui/marketing-button'
import { finalizeRecoverySessionAction } from '@/src/modules/auth/application/finalize-recovery-session'
import {
  parseRecoveryOtpType,
  verifyRecoveryLink as establishRecoverySessionFromUrl,
} from '@/src/modules/auth/application/verify-recovery-link'
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from '@/src/modules/auth/infrastructure/supabase/client'

type ResetStatus = 'loading' | 'ready' | 'invalid' | 'not_configured'

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

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<ResetStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrapRecoverySession() {
      if (!isSupabaseBrowserConfigured()) {
        if (process.env.NEXT_PUBLIC_AUTH_STUB === 'true') {
          setStatus('ready')
          return
        }
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

      if (tokenHash || code || hash.access_token) {
        setStatus('invalid')
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
    setErrorMessage(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirm = String(formData.get('confirmPassword') ?? '')

    if (password.length < 8) {
      setErrorMessage(portal.reset.errors.weak_password)
      setPending(false)
      return
    }

    if (password !== confirm) {
      setErrorMessage(portal.reset.errors.mismatch)
      setPending(false)
      return
    }

    if (!isSupabaseBrowserConfigured()) {
      if (process.env.NEXT_PUBLIC_AUTH_STUB === 'true') {
        setErrorMessage(portal.reset.errors.not_configured)
        setPending(false)
        return
      }
      setErrorMessage(portal.reset.errors.not_configured)
      setPending(false)
      return
    }

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(portal.reset.errors.unknown)
      setPending(false)
      return
    }

    await finalizeRecoverySessionAction()
    setPending(false)
  }

  if (status === 'loading') {
    return (
      <p className="text-sm text-muted-on-dark">{portal.reset.verifyingLink}</p>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-destructive">
          {portal.reset.errors.invalid_link}
        </p>
        <Link
          href="/login/recuperar"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {portal.reset.requestNewLinkLabel}
        </Link>
      </div>
    )
  }

  if (status === 'not_configured') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {portal.reset.errors.not_configured}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
        >
          {portal.reset.passwordLabel}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="confirmPassword"
          className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
        >
          {portal.reset.confirmPasswordLabel}
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base"
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <MarketingButton
        type="submit"
        marketingVariant="primary"
        className="h-12 w-full rounded-lg text-base font-semibold"
        disabled={pending}
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
