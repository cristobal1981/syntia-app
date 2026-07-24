'use client'

import Link from 'next/link'
import { Unlink } from 'lucide-react'

import { portal } from '@/content/portal'
import { MarketingButton } from '@/components/ui/marketing-button'

export function ResetLinkUnavailable() {
  const copy = portal.reset.unavailable

  return (
    <div
      role="alert"
      className="flex flex-col items-center px-1 py-4 text-center sm:px-2 sm:py-6"
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-agua/20 bg-on-dark/10 shadow-lg shadow-black/20 sm:mb-6 sm:size-16">
        <Unlink
          className="size-7 text-on-dark sm:size-8"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>

      <p className="text-[0.65rem] font-medium tracking-[0.14em] text-muted-on-dark uppercase">
        {copy.eyebrow}
      </p>

      <h2 className="mt-2 max-w-xs text-xl font-semibold tracking-tight text-on-dark sm:text-2xl">
        {copy.title}
      </h2>

      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-on-dark">
        {copy.description}
      </p>

      <MarketingButton
        asChild
        marketingVariant="primary"
        className="mt-7 h-11 w-full max-w-xs rounded-lg text-sm font-semibold sm:h-12 sm:text-base"
      >
        <Link href="/login/recuperar">{copy.ctaLabel}</Link>
      </MarketingButton>

      <p className="mt-5 text-sm text-muted-on-dark">
        <Link href="/login" className="text-primary hover:underline">
          {portal.reset.backToLoginLabel}
        </Link>
      </p>
    </div>
  )
}
