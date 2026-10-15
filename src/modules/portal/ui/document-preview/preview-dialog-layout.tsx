'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { Download, FileText, Printer, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DocumentPreviewCategory } from '@/src/modules/portal/domain/classify-document-preview'
import { printBase64Pdf } from '@/src/modules/portal/lib/print-base64-pdf'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import { PreviewFormatBadge } from '@/src/modules/portal/ui/document-preview/preview-format-badge'

/** Fondo oscurecido, sin desenfoque: la pantalla de debajo se intuye pero no distrae. */
const OVERLAY_CLASS = 'bg-black/80 backdrop-blur-none dark:bg-black/85'

/** Pantalla completa y transparente: el velo es el del overlay; barra y documento flotan encima. */
const CONTENT_CLASS =
  'fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 text-white shadow-none sm:max-w-none'

const PreviewCloseContext = createContext<() => void>(() => {})

/** Cierra el visor (para los visores que pintan su propia zona de fondo). */
export function usePreviewClose(): () => void {
  return useContext(PreviewCloseContext)
}

const CARD_WIDTH: Record<DocumentPreviewCategory, string> = {
  pdf: 'sm:max-w-[56rem]',
  image: 'sm:max-w-[56rem]',
  docx: 'sm:max-w-[60rem]',
  xlsx: 'sm:max-w-[76rem]',
  unsupported: 'sm:max-w-lg',
}

function columnClass(category: DocumentPreviewCategory | null, ready: boolean): string {
  // PDF e imagen se pintan directamente sobre el velo (el PDF trae su propio scroll).
  if (ready && (category === 'pdf' || category === 'image')) {
    return 'flex min-h-0 w-full flex-1 flex-col'
  }
  // Word/Excel necesitan un lienzo claro; carga, error y avisos van en una tarjeta compacta.
  const compact = !ready || category === null || category === 'unsupported'
  return cn(
    'flex min-h-0 w-full flex-col overflow-hidden bg-background p-3 text-foreground sm:rounded-lg sm:p-4 sm:shadow-2xl',
    compact ? 'min-h-48 sm:h-auto sm:self-center' : 'h-full',
    CARD_WIDTH[ready ? (category ?? 'unsupported') : 'unsupported']
  )
}

type PreviewViewerFile = {
  filename: string
  mimetype: string
  dataBase64: string
}

type PreviewViewerShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  closeLabel: string
  category: DocumentPreviewCategory | null
  /** Insignia «el formato puede variar» (Word/Excel). */
  showFormatBadge?: boolean
  /** Archivo ya cargado: habilita descargar e imprimir. */
  file: PreviewViewerFile | null
  /** El documento se está mostrando (no carga, error ni aviso). */
  ready: boolean
  children: ReactNode
}

/**
 * Marco común de todas las previsualizaciones: barra de acciones a ancho
 * completo (cerrar a la izquierda, imprimir y descargar a la derecha) y el
 * documento centrado sobre un fondo oscurecido. Pulsar fuera del documento cierra.
 */
export function PreviewViewerShell({
  open,
  onOpenChange,
  title,
  closeLabel,
  category,
  showFormatBadge = false,
  file,
  ready,
  children,
}: PreviewViewerShellProps) {
  const close = () => onOpenChange(false)
  const canPrint = file !== null && category === 'pdf'
  const iconButton =
    'size-9 shrink-0 cursor-pointer text-white hover:bg-white/10 hover:text-white'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={CONTENT_CLASS}
        overlayClassName={OVERLAY_CLASS}
        aria-label={closeLabel}
      >
        <header className="flex shrink-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={iconButton}
              aria-label={closeLabel}
            >
              <X className="size-5" aria-hidden />
            </Button>
          </DialogClose>

          <FileText className="hidden size-5 shrink-0 text-white/70 sm:block" aria-hidden />
          <DialogTitle className="min-w-0 flex-1 truncate text-left text-sm font-medium text-white sm:text-base">
            {title}
          </DialogTitle>

          {showFormatBadge ? (
            <div className="hidden shrink-0 sm:block">
              <PreviewFormatBadge />
            </div>
          ) : null}

          <div className="flex shrink-0 items-center gap-1">
            {canPrint ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconButton}
                aria-label="Imprimir"
                title="Imprimir"
                onClick={() => printBase64Pdf(file.dataBase64)}
              >
                <Printer className="size-5" aria-hidden />
              </Button>
            ) : null}
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconButton}
                aria-label="Descargar"
                title="Descargar"
                onClick={() =>
                  triggerBase64Download(file.filename, file.mimetype, file.dataBase64)
                }
              >
                <Download className="size-5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </header>

        {showFormatBadge ? (
          <div className="flex shrink-0 justify-center pb-2 sm:hidden">
            <PreviewFormatBadge />
          </div>
        ) : null}

        <PreviewCloseContext.Provider value={close}>
          <div
            role="presentation"
            className={cn(
              'flex min-h-0 flex-1 justify-center overflow-hidden',
              ready && category === 'pdf' ? '' : 'sm:px-4 sm:pb-4'
            )}
            onClick={(event) => {
              if (event.target === event.currentTarget) close()
            }}
          >
            <div className={columnClass(category, ready)} aria-live="polite">
              {children}
            </div>
          </div>
        </PreviewCloseContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
