'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Upload } from 'lucide-react'

import { Sappo } from '@/components/errors/sappo'
import { Checkbox } from '@/components/ui/checkbox'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { portal } from '@/content/portal'
import { runWhenIdle } from '@/lib/run-when-idle'
import { cn } from '@/lib/utils'
import {
  getInvoiceUploadAvailabilityAction,
  uploadInvoiceFilesAction,
} from '@/src/modules/documents/application/portal-drive-document-actions'
import {
  isUploadRejection,
  presentDriveError,
} from '@/src/modules/documents/domain/drive-error-presentation'
import { DRIVE_DOCUMENTS_CHANGED_EVENT } from '@/src/modules/documents/domain/drive-events'
import type { DriveUiErrorCode } from '@/src/modules/documents/domain/drive-error-presentation'
import { INVOICE_YEAR_FOLDER_NAME } from '@/src/modules/documents/domain/invoice-upload-target'
import type { DriveDuplicate } from '@/src/modules/documents/domain/types'
import { callDriveAction } from '@/src/modules/documents/ui/call-drive-action'
import {
  DriveDropOverlay,
  type DriveDropOverlayUploadPhase,
} from '@/src/modules/documents/ui/drive-drop-overlay'
import { UPLOAD_ACCEPT_ATTRIBUTE } from '@/src/modules/portal/domain/upload-policy'
import { useOnboardingChecklistOptional } from '@/src/modules/portal/ui/onboarding-checklist-context'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const copy = portal.shell.quickInvoice

const NOTICE_DISMISSED_KEY = 'syntia-quick-invoice-notice-dismissed'

function readNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(NOTICE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function writeNoticeDismissed() {
  try {
    localStorage.setItem(NOTICE_DISMISSED_KEY, '1')
  } catch {
    // Sin almacenamiento (modo privado…): el aviso simplemente seguirá saliendo.
  }
}

type PortalQuickInvoiceContextValue = {
  available: boolean
  busy: boolean
  folderName: string | null
  /**
   * Punto de entrada de los botones: muestra antes del selector un aviso con
   * qué se sube y a dónde, salvo que se haya marcado «No volver a mostrar».
   */
  requestUpload: () => void
}

const PortalQuickInvoiceContext = createContext<PortalQuickInvoiceContextValue | null>(null)

export function usePortalQuickInvoiceOptional() {
  return useContext(PortalQuickInvoiceContext)
}

type PortalQuickInvoiceProviderProps = {
  children: ReactNode
  /** Solo cliente y colaborador (la comprobación de escritura la hace el servidor). */
  enabled: boolean
}

export function PortalQuickInvoiceProvider({
  children,
  enabled,
}: PortalQuickInvoiceProviderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [available, setAvailable] = useState(false)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [phase, setPhase] = useState<DriveDropOverlayUploadPhase>('idle')
  const [duplicate, setDuplicate] = useState<DriveDuplicate | null>(null)
  const [rejection, setRejection] = useState<DriveUiErrorCode | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [skipNoticeNextTime, setSkipNoticeNextTime] = useState(false)

  // El botón solo aparece si el servidor confirma que existe la carpeta de
  // facturas del año; se pregunta una vez, sin bloquear la carga de la página.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // Va a Drive (~1 s) y las Server Actions van en cola: si se lanzara al montar, el chat que se
    // abre desde un aviso esperaría detrás. El botón puede tardar un poco en salir.
    const cancelIdle = runWhenIdle(() => {
      void getInvoiceUploadAvailabilityAction()
        .then((result) => {
          if (cancelled) return
          setAvailable(result.available)
          setFolderName(result.folderName ?? null)
        })
        .catch(() => {
          // Sin conexión o pestaña vieja: simplemente no hay botón.
        })
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [enabled])

  const busy = phase === 'uploading'

  const dismiss = useCallback(() => {
    setDuplicate(null)
    setRejection(null)
    setPhase('idle')
  }, [])

  const upload = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setDuplicate(null)
    setRejection(null)
    setPhase('uploading')

    const formData = new FormData()
    for (const file of files) formData.append('files', file)

    const result = await callDriveAction(() => uploadInvoiceFilesAction(formData))

    if (result.ok) {
      setPhase('success')
      window.dispatchEvent(new Event(DRIVE_DOCUMENTS_CHANGED_EVENT))
      window.setTimeout(() => setPhase('idle'), 1500)
      return
    }

    if (result.error === 'duplicate' && 'duplicate' in result && result.duplicate) {
      setDuplicate(result.duplicate)
      setPhase('duplicate')
      return
    }

    if (isUploadRejection(result.error)) {
      setRejection(result.error)
      setPhase('rejected')
      return
    }

    // Errores que no se arreglan cambiando el archivo (sin red, servicio…): aviso breve.
    const presentation = presentDriveError(result.error, 'upload')
    setPhase('idle')
    toast.error(presentation.title, { description: presentation.description })
  }, [])

  const requestUpload = useCallback(() => {
    if (!enabled || !available || busy) return
    if (readNoticeDismissed()) {
      // El selector se abre desde un gesto del usuario: este mismo clic.
      inputRef.current?.click()
      return
    }
    setSkipNoticeNextTime(false)
    setNoticeOpen(true)
  }, [enabled, available, busy])

  const value = useMemo<PortalQuickInvoiceContextValue>(
    () => ({ available: enabled && available, busy, folderName, requestUpload }),
    [enabled, available, busy, folderName, requestUpload]
  )

  return (
    <PortalQuickInvoiceContext.Provider value={value}>
      {children}
      {enabled ? (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              void upload(files)
            }}
          />
          <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{copy.notice.title}</DialogTitle>
                <DialogDescription>{copy.notice.intro}</DialogDescription>
              </DialogHeader>
              <ol
                className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm"
                aria-label="Carpeta de destino"
              >
                {[copy.notice.pathRoot, INVOICE_YEAR_FOLDER_NAME, folderName ?? ''].map(
                  (crumb, index, all) => (
                    <li key={`${index}-${crumb}`} className="flex min-w-0 items-center gap-1">
                      {index > 0 ? (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      ) : null}
                      <span
                        className={cn(
                          'truncate',
                          index === all.length - 1
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {crumb}
                      </span>
                    </li>
                  )
                )}
              </ol>
              <div className="flex items-start gap-3">
                <Sappo mood="carrier" className="block h-auto w-12 shrink-0" />
                <p className="text-sm text-muted-foreground">{copy.notice.limits}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={skipNoticeNextTime}
                  onCheckedChange={setSkipNoticeNextTime}
                />
                {copy.notice.dontShowAgain}
              </label>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setNoticeOpen(false)}
                >
                  {copy.notice.cancel}
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  autoFocus
                  onClick={() => {
                    if (skipNoticeNextTime) writeNoticeDismissed()
                    setNoticeOpen(false)
                    // El selector se abre desde un gesto del usuario: este mismo clic.
                    inputRef.current?.click()
                  }}
                >
                  <Upload className="size-4" aria-hidden />
                  {copy.notice.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DriveDropOverlay
            active={phase !== 'idle'}
            uploadPhase={phase}
            duplicate={duplicate}
            uploadRejection={rejection}
            onDismiss={dismiss}
          />
        </>
      ) : null}
    </PortalQuickInvoiceContext.Provider>
  )
}

type PortalQuickInvoiceButtonProps = {
  /** Barra lateral plegada: solo el icono con tooltip. */
  collapsed?: boolean
  /** `lg` es la variante del menú móvil. */
  size?: 'sm' | 'lg'
  onAfterClick?: () => void
}

/**
 * Botón «Factura de compra»: una tarjeta en verde agua de marca con el icono en
 * degradado Verde Syntia → turquesa (a propósito distinta del botón verde
 * sólido de «Nueva consulta»).
 * No se pinta si no hay carpeta de destino.
 */
export function PortalQuickInvoiceButton({
  collapsed = false,
  size = 'sm',
  onAfterClick,
}: PortalQuickInvoiceButtonProps) {
  const quickInvoice = usePortalQuickInvoiceOptional()
  const checklist = useOnboardingChecklistOptional()
  if (!quickInvoice?.available) return null

  const large = size === 'lg'
  const Icon = quickInvoice.busy ? Loader2 : Upload
  const label = copy.label
  const hint = quickInvoice.folderName
    ? copy.hint.replace('{folder}', quickInvoice.folderName)
    : label

  const tile = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-sm',
        'bg-[linear-gradient(135deg,var(--primary),var(--turquesa))]',
        'transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-105',
        large ? 'size-10' : 'size-9'
      )}
    >
      <Icon
        className={cn(
          large ? 'size-5' : 'size-[1.125rem]',
          'transition-transform duration-200',
          quickInvoice.busy
            ? 'animate-spin motion-reduce:animate-none'
            : 'motion-safe:group-hover:-translate-y-0.5'
        )}
        strokeWidth={2.25}
        aria-hidden
      />
    </span>
  )

  const button = (
    <button
      type="button"
      onClick={() => {
        quickInvoice.requestUpload()
        checklist?.markStepComplete('facturaCompra')
        onAfterClick?.()
      }}
      disabled={quickInvoice.busy}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? undefined : hint}
      className={cn(
        'nav-action group flex w-full cursor-pointer items-center rounded-xl text-left transition-colors',
        'disabled:cursor-wait disabled:opacity-80',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        collapsed ? 'justify-center p-1.5' : large ? 'gap-3 px-3 py-2.5' : 'gap-3 px-2.5 py-2'
      )}
    >
      {tile}
      {collapsed ? null : (
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate font-semibold text-sidebar-foreground',
              large ? 'text-base' : 'text-sm'
            )}
          >
            {label}
          </span>
          <span className="block truncate text-xs text-sidebar-muted-foreground">
            {quickInvoice.busy ? copy.busy : copy.subtitle}
          </span>
        </span>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <PortalActionTooltip content={hint} side="right">
        {button}
      </PortalActionTooltip>
    )
  }

  return button
}

/**
 * Botón central de la barra inferior (móvil): círculo elevado con el degradado
 * de marca. Pulsarlo abre primero un aviso con qué se sube y a dónde (salvo que
 * se haya marcado «No volver a mostrar»).
 */
export function PortalQuickInvoiceBottomBarButton() {
  const quickInvoice = usePortalQuickInvoiceOptional()
  const checklist = useOnboardingChecklistOptional()
  if (!quickInvoice?.available) return null

  const Icon = quickInvoice.busy ? Loader2 : Upload

  return (
    <button
      type="button"
      onClick={() => {
        quickInvoice.requestUpload()
        checklist?.markStepComplete('facturaCompra')
      }}
      disabled={quickInvoice.busy}
      aria-label={copy.label}
      className="group flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-end gap-0.5 pb-1.5 text-[11px] font-medium text-sidebar-foreground focus-visible:outline-none disabled:cursor-wait"
    >
      <span
        className={cn(
          '-mt-6 flex size-12 items-center justify-center rounded-full text-primary-foreground shadow-lg',
          'bg-[linear-gradient(135deg,var(--primary),var(--turquesa))]',
          'ring-4 ring-sidebar transition-transform active:scale-95',
          'group-focus-visible:ring-sidebar-ring'
        )}
      >
        <Icon
          className={cn('size-5', quickInvoice.busy && 'animate-spin motion-reduce:animate-none')}
          strokeWidth={2.25}
          aria-hidden
        />
      </span>
      <span className="truncate">{quickInvoice.busy ? copy.busy : copy.shortLabel}</span>
    </button>
  )
}
