'use client'

import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useCallback, useEffect, useRef, useState } from 'react'

import { signInWithGoogleIdTokenAction } from '@/src/modules/auth/application/sign-in-with-google'
import { getGoogleClientId } from '@/src/modules/auth/infrastructure/google/google-client-id'
import { GoogleSignInButtonFallback } from '@/src/modules/auth/ui/google-sign-in-button-fallback'
import { markPortalEntryPending } from '@/src/modules/portal/ui/portal-entry-loading-context'

/**
 * Botón oficial vía @react-oauth/google (wrapper de Google Identity Services).
 * @see https://developers.google.com/identity/gsi/web/guides/display-button
 */
export function GoogleSignInButton() {
  const clientId = getGoogleClientId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [useFallback, setUseFallback] = useState(!clientId)

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    const updateWidth = () => {
      setWidth(Math.max(Math.floor(host.getBoundingClientRect().width), 200))
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(host)
    return () => resizeObserver.disconnect()
  }, [])

  const handleSuccess = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setUseFallback(true)
        return
      }
      markPortalEntryPending()
      await signInWithGoogleIdTokenAction(response.credential)
    },
    []
  )

  if (useFallback) {
    return <GoogleSignInButtonFallback />
  }

  return (
    <div ref={containerRef} className="w-full">
      <GoogleOAuthProvider clientId={clientId!} locale="es">
        {width > 0 ? (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setUseFallback(true)}
            theme="outline"
            size="large"
            text="continue_with"
            width={width}
            containerProps={{ className: 'flex w-full justify-center' }}
          />
        ) : (
          <div
            className="h-10 w-full rounded border border-[#747775] bg-white"
            aria-hidden
          />
        )}
      </GoogleOAuthProvider>
    </div>
  )
}
