"use client"

import { useEffect } from "react"
import { TechErrorScreen } from "@/components/errors/tech-error-screen"
import { errorPages } from "@/content/errors"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const page = errorPages[500]

  return (
    <TechErrorScreen
      code={page.code}
      title={page.title}
      description={page.description}
      playHint={page.playHint}
      primaryHref={page.primaryHref}
      primaryLabel={page.primaryLabel}
      retryLabel={page.retryLabel}
      backdropVariant="overload"
      onRetry={reset}
    />
  )
}
