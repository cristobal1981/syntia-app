'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, CloudUpload, FileText } from 'lucide-react'

import { Sappo } from '@/components/errors/sappo'
import { Button } from '@/components/ui/button'
import { clientDocuments } from '@/content/client-documents'
import { duplicateLocationCrumbs } from '@/src/modules/documents/domain/duplicate-location'
import type { DriveDuplicate } from '@/src/modules/documents/domain/types'
import { cn } from '@/lib/utils'

export type DriveDropOverlayUploadPhase = 'idle' | 'uploading' | 'success' | 'duplicate'

type DriveDropOverlayProps = {
  active: boolean
  uploadPhase?: DriveDropOverlayUploadPhase
  /** Archivo repetido que ha impedido la subida (fase `duplicate`). */
  duplicate?: DriveDuplicate | null
  onDismiss?: () => void
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

function UploadMascot({ phase }: { phase: 'upload' | 'uploading' | 'success' }) {
  if (phase === 'upload') {
    return <CloudUpload className="size-12 fill-primary/20 stroke-primary" strokeWidth={1.75} aria-hidden />
  }

  return (
    <Sappo
      mood={phase === 'success' ? 'cheer' : 'carrier'}
      className="block h-24 w-auto motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300"
    />
  )
}

function DuplicateCard({
  duplicate,
  onDismiss,
}: {
  duplicate: DriveDuplicate
  onDismiss?: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  const crumbs = duplicateLocationCrumbs(duplicate.folders, clientDocuments.rootBreadcrumb)

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="drive-duplicate-title"
      aria-describedby="drive-duplicate-hint"
      className="flex w-full max-w-md flex-col items-center gap-4"
    >
      <Sappo
        mood="oops"
        className="block h-24 w-auto motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300"
      />
      <p id="drive-duplicate-title" className="text-lg font-semibold text-foreground">
        {duplicate.inSelection
          ? clientDocuments.duplicateSelectionTitle
          : clientDocuments.duplicateTitle}
      </p>

      <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="size-5 shrink-0 text-violet-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{clientDocuments.duplicateFileLabel}</p>
            <p className="truncate text-sm font-medium text-foreground" title={duplicate.name}>
              {duplicate.name}
            </p>
          </div>
        </div>

        {duplicate.inSelection ? null : (
          <div className="border-t border-border pt-3">
            <p className="mb-1.5 text-xs text-muted-foreground">
              {clientDocuments.duplicateLocationLabel}
            </p>
            <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1
                return (
                  <li key={`${index}-${crumb}`} className="flex min-w-0 items-center gap-1">
                    {index > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
                    <span
                      className={cn(
                        'max-w-[10rem] truncate rounded-md px-1.5 py-0.5',
                        isLast
                          ? 'bg-primary/10 font-medium text-foreground'
                          : 'bg-muted/60'
                      )}
                      title={crumb}
                    >
                      {crumb}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      <p id="drive-duplicate-hint" className="max-w-sm text-sm text-muted-foreground">
        {duplicate.inSelection
          ? clientDocuments.duplicateSelectionHint
          : clientDocuments.duplicateHint}
      </p>

      <Button type="button" className="cursor-pointer" autoFocus onClick={onDismiss}>
        {clientDocuments.duplicateDismiss}
      </Button>
    </div>
  )
}

export function DriveDropOverlay({
  active,
  uploadPhase = 'idle',
  duplicate = null,
  onDismiss,
}: DriveDropOverlayProps) {
  const [hovering, setHovering] = useState(false)
  const [progress, setProgress] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()

  const isUploading = uploadPhase === 'uploading'
  const isSuccess = uploadPhase === 'success'
  const isDuplicate = uploadPhase === 'duplicate' && duplicate !== null
  const isDragMode = !isUploading && !isSuccess && !isDuplicate

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
        isUploading || isSuccess || isDuplicate ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      role={isUploading ? 'status' : undefined}
      aria-live={isUploading || isSuccess ? 'polite' : undefined}
      aria-busy={isUploading || undefined}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-6 min-h-[40vh] w-full max-w-2xl rounded-2xl border-2 border-primary bg-primary/5',
          isDuplicate && 'border-amber-500 bg-amber-500/5',
          isDragMode && !hovering && 'border-dashed',
          isDragMode &&
            hovering &&
            'border-solid ring-8 ring-primary/35 ring-offset-0 motion-reduce:animate-none motion-reduce:ring-0 motion-safe:animate-pulse',
          (isUploading || isSuccess || isDuplicate) && 'border-solid'
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
          {isDuplicate ? null : <UploadMascot phase={isSuccess ? 'success' : isUploading ? 'uploading' : 'upload'} />}

          {isDuplicate && duplicate ? (
            <DuplicateCard duplicate={duplicate} onDismiss={onDismiss} />
          ) : isUploading || isSuccess ? (
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
