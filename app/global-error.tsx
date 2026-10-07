'use client'

import { Host_Grotesk } from 'next/font/google'
import { useEffect } from 'react'

import { ErrorStage } from '@/components/errors/error-stage'
import './globals.css'

const hostGrotesk = Host_Grotesk({
  subsets: ['latin'],
  variable: '--font-host-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es" className={`${hostGrotesk.variable} bg-surface-dark`}>
      <body className="font-sans antialiased">
        <ErrorStage variant="fatal" onRetry={reset} digest={error.digest} />
      </body>
    </html>
  )
}
