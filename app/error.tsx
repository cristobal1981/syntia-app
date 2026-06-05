"use client"

import { useEffect } from "react"
import { ErrorScreen } from "@/components/errors/error-screen"
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
    <ErrorScreen
      code={page.code}
      title={page.title}
      description={page.description}
      image={page.image}
      imageAlt={page.imageAlt}
      primaryHref={page.primaryHref}
      primaryLabel={page.primaryLabel}
      onRetry={reset}
    />
  )
}
