'use client'

import { useEffect, useState } from 'react'
import { CloudCheck, CloudUpload } from 'lucide-react'

import { clientDocuments } from '@/content/client-documents'
import { cn } from '@/lib/utils'

export type DriveDropOverlayUploadPhase = 'idle' | 'uploading' | 'success'

type DriveDropOverlayProps = {
  active: boolean
  uploadPhase?: DriveDropOverlayUploadPhase
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function CloudIcon({ variant }: { variant: 'upload' | 'success' }) {
  const Icon = variant === 'success' ? CloudCheck : CloudUpload

  return (
    <Icon
      className={cn(
        'size-12 stroke-primary',
        variant === 'success' ? 'fill-primary/30' : 'fill-primary/20',
        variant === 'success' && 'motion-reduce:scale-100 scale-100 motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300'
      )}
      strokeWidth={1.75}
      aria-hidden
    />
  )
}

export function DriveDropOverlay({
  active,
  uploadPhase = 'idle',
}: DriveDropOverlayProps) {
  const [hovering, setHovering] = useState(false)
  const [progress, setProgress] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()

  const isUploading = uploadPhase === 'uploading'
  const isSuccess = uploadPhase === 'success'
  const isDragMode = !isUploading && !isSuccess

  // Ajustes durante el render (no en efectos): resetear el hover al
  // desactivarse y saltar a 100% al completar, ambos derivables de sus
  // props sin async ni suscripción externa.
  const [prevActive, setPrevActiveForHover] = useState(active)
  if (active !== prevActive) {
    setPrevActiveForHover(active)
    if (!active) setHovering(false)
  }

  const [prevIsSuccess, setPrevIsSuccess] = useState(isSuccess)
  if (isSuccess !== prevIsSuccess) {
    setPrevIsSuccess(isSuccess)
    if (isSuccess) setProgress(100)
  }

  useEffect(() => {
    if (!isUploading) return

    // Animación de progreso falsa con setInterval — efecto externo real
    // (temporizador), no una derivación de render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(8)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current
        const step = current < 50 ? 4 : current < 80 ? 2 : 1
        return Math.min(current + step, 92)
      })
    }, 120)

    return () => window.clearInterval(interval)
  }, [isUploading])

  if (!active) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm',
        isUploading || isSuccess ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      role={isUploading ? 'status' : undefined}
      aria-live={isUploading || isSuccess ? 'polite' : undefined}
      aria-busy={isUploading || undefined}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-6 min-h-[40vh] w-full max-w-2xl rounded-2xl border-2 border-primary bg-primary/5',
          isDragMode && !hovering && 'border-dashed',
          isDragMode &&
            hovering &&
            'border-solid ring-8 ring-primary/35 ring-offset-0 motion-reduce:animate-none motion-reduce:ring-0 motion-safe:animate-pulse',
          (isUploading || isSuccess) && 'border-solid'
        )}
        onDragEnter={(event) => {
          if (!isDragMode) return
          event.preventDefault()
          setHovering(true)
        }}
        onDragLeave={(event) => {
          if (!isDragMode) return
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setHovering(false)
        }}
        onDragOver={(event) => {
          if (!isDragMode) return
          event.preventDefault()
          setHovering(true)
        }}
      >
        <div className="relative flex min-h-[40vh] flex-col items-center justify-center gap-4 px-8 py-10 text-center">
          <CloudIcon variant={isSuccess ? 'success' : 'upload'} />

          {isUploading || isSuccess ? (
            <>
              <p className="text-lg font-semibold text-foreground">
                {isSuccess
                  ? clientDocuments.dropOverlaySuccessTitle
                  : clientDocuments.dropOverlayUploadingTitle}
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none',
                    isUploading && !prefersReducedMotion && progress < 92 && 'opacity-90'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                {isSuccess
                  ? clientDocuments.dropOverlaySuccessHint
                  : clientDocuments.dropOverlayUploadingHint}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">
                {hovering
                  ? clientDocuments.dropOverlayReleaseTitle
                  : clientDocuments.dropOverlayTitle}
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                {hovering
                  ? clientDocuments.dropOverlayReleaseHint
                  : clientDocuments.dropOverlayHint}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
