'use client'

import { ArrowRight, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Sappo } from '@/components/errors/sappo'
import { MarketingButton } from '@/components/ui/marketing-button'
import { errorPages, type ErrorVariant, type ErrorVariantKey } from '@/content/errors'
import { site } from '@/content/site'

type ErrorStageProps = {
  variant: ErrorVariantKey
  /** Reintento del boundary de Next (error.tsx); sustituye a la acción primaria. */
  onRetry?: () => void
  /** Referencia opaca del fallo para soporte; nunca se muestra el mensaje de la excepción. */
  digest?: string
}

const BUBBLE_VISIBLE_MS = 4200

export function ErrorStage({ variant, onRetry, digest }: ErrorStageProps) {
  const page: ErrorVariant = errorPages[variant as keyof typeof errorPages]
  const hopRef = useRef<HTMLSpanElement>(null)
  const nextCroak = useRef(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [croak, setCroak] = useState<{ text: string; id: number } | null>(null)

  const say = (index: number) => {
    clearTimeout(hideTimer.current)
    setCroak({ text: page.croaks[index % page.croaks.length], id: Date.now() })
    hideTimer.current = setTimeout(() => setCroak(null), BUBBLE_VISIBLE_MS)
  }

  useEffect(() => {
    const first = setTimeout(() => {
      say(0)
      nextCroak.current = 1
    }, 800)
    return () => {
      clearTimeout(first)
      clearTimeout(hideTimer.current)
    }
    // say solo lee refs y la página (estable por variante)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  const poke = () => {
    const el = hopRef.current
    if (el) {
      el.classList.remove('sappo-hop')
      void el.offsetWidth
      el.classList.add('sappo-hop')
    }
    say(nextCroak.current)
    nextCroak.current += 1
  }

  const [ghostStart, ghostEnd] = page.ghost
  const wide = ghostStart.length + ghostEnd.length > 3
  const stageSize = wide
    ? 'clamp(3.5rem, min(14vw, 24dvh), 12rem)'
    : 'clamp(6rem, min(24vw, 34dvh), 18rem)'
  const { retryLabel, secondary } = page

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden bg-surface-dark text-on-dark">
      <header className="relative z-10 px-5 pt-5 sm:px-10 sm:pt-8">
        <Link
          href="/"
          aria-label="Syntia, ir al inicio"
          className="inline-block rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Image
            src={site.brand.logoHorizontalNegativo}
            alt="Syntia"
            width={220}
            height={48}
            priority
            className="h-8 w-auto sm:h-10"
          />
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pt-14 pb-8 text-center">
        <div
          className="relative flex items-end justify-center font-sans leading-none font-bold"
          style={{ fontSize: stageSize }}
        >
          <span
            aria-hidden
            className="select-none pb-[0.02em] text-[color-mix(in_oklch,var(--agua)_40%,var(--surface-dark))]"
          >
            {ghostStart}
          </span>

          <div className="relative mx-[0.05em]">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                aria-hidden
                data-n={n}
                className="sappo-ripple pointer-events-none absolute top-[100%] left-1/2 h-[0.34em] w-[1.9em] -translate-x-1/2 -translate-y-1/4 rounded-[50%] border border-turquesa/60"
              />
            ))}

            <div
              aria-hidden
              className="pointer-events-none absolute top-[96%] left-1/2 h-[0.2em] w-[1.15em] -translate-x-1/2 rounded-[50%] bg-secondary"
            />

            <span ref={hopRef} className="sappo-hop block">
              <button
                type="button"
                onClick={poke}
                aria-label="Sappo mascota. Púlsalo para que croe"
                className="relative block cursor-pointer rounded-[2rem] focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface-dark focus-visible:outline-none"
              >
                <Sappo mood={page.mood} className="block h-[0.96em] w-auto" />
              </button>
            </span>

            <div role="status" aria-live="polite">
              {croak ? (
                <p
                  key={croak.id}
                  className="sappo-bubble pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 w-max max-w-[min(15rem,78vw)] -translate-x-1/2 rounded-2xl bg-brisa px-4 py-2.5 font-sans text-sm leading-snug font-semibold text-surface-dark shadow-lg"
                  style={{ fontSize: '0.95rem' }}
                >
                  {croak.text}
                  <span
                    aria-hidden
                    className="absolute top-full left-1/2 size-3 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-brisa"
                  />
                </p>
              ) : null}
            </div>
          </div>

          <span
            aria-hidden
            className="select-none pb-[0.02em] text-[color-mix(in_oklch,var(--agua)_40%,var(--surface-dark))]"
          >
            {ghostEnd}
          </span>
        </div>

        <div className="mt-16 flex max-w-2xl flex-col items-center duration-700 animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <p className="text-sm font-semibold text-primary">{page.eyebrow}</p>
          <h1 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-balance text-on-dark sm:text-4xl sm:leading-[1.12]">
            {page.title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-muted-on-dark sm:text-lg">
            {page.description}
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            {onRetry ? (
              <>
                <MarketingButton type="button" size="lg" className="px-8" onClick={onRetry}>
                  <RotateCcw aria-hidden />
                  {retryLabel ?? 'Intentar de nuevo'}
                </MarketingButton>
                <MarketingButton
                  asChild
                  size="lg"
                  variant="outline"
                  marketingVariant="secondary"
                  className="px-8"
                >
                  <Link href={page.primary.href}>{page.primary.label}</Link>
                </MarketingButton>
              </>
            ) : (
              <>
                <MarketingButton asChild size="lg" className="px-8">
                  <Link href={page.primary.href}>
                    {page.primary.label}
                    <ArrowRight aria-hidden />
                  </Link>
                </MarketingButton>
                {secondary ? (
                  <MarketingButton
                    asChild
                    size="lg"
                    variant="outline"
                    marketingVariant="secondary"
                    className="px-8"
                  >
                    <Link href={secondary.href}>{secondary.label}</Link>
                  </MarketingButton>
                ) : null}
              </>
            )}
          </div>

          {digest ? (
            <p className="mt-8 text-xs text-muted-on-dark">
              Código de referencia:{' '}
              <span className="font-semibold tabular-nums select-all">{digest}</span>
            </p>
          ) : null}
        </div>
      </div>

      <footer className="relative z-10 px-5 pb-6 text-center text-xs text-muted-on-dark">
        {site.brand.claim}
      </footer>
    </main>
  )
}
