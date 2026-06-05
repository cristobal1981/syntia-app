"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MarketingButton } from "@/components/ui/marketing-button"
import { cn } from "@/lib/utils"

interface ErrorScreenProps {
  code: string
  title: string
  description: string
  image: string
  imageAlt: string
  primaryHref: string
  primaryLabel: string
  onRetry?: () => void
}

export function ErrorScreen({
  code,
  title,
  description,
  image,
  imageAlt,
  primaryHref,
  primaryLabel,
  onRetry,
}: ErrorScreenProps) {
  return (
    <main className="relative h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-background/92 via-background/85 to-card/90"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p
            className={cn(
              "mb-4 font-sans font-bold tracking-tight text-primary",
              code.length > 6 ? "text-4xl sm:text-5xl" : "text-7xl sm:text-8xl"
            )}
          >
            {code}
          </p>
          <h1 className="mb-4 text-2xl font-bold text-on-dark sm:text-3xl">{title}</h1>
          <p className="prose-width mx-auto mb-10 text-lg leading-relaxed text-muted-on-dark">
            {description}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MarketingButton asChild size="lg" className="px-8">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </MarketingButton>
            {onRetry ? (
              <MarketingButton
                type="button"
                size="lg"
                variant="outline"
                marketingVariant="secondary"
                className="px-8"
                onClick={onRetry}
              >
                Intentar de nuevo
              </MarketingButton>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
