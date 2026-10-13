'use client'

import { useEffect } from 'react'

import { ErrorStage } from '@/components/errors/error-stage'

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

  return <ErrorStage variant="500" onRetry={reset} digest={error.digest} />
}
