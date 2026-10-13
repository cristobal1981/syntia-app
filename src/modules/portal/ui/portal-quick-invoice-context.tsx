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
import { Loader2, Upload } from 'lucide-react'

import { portal } from '@/content/portal'
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
import type { DriveDuplicate } from '@/src/modules/documents/domain/types'
import { callDriveAction } from '@/src/modules/documents/ui/call-drive-action'
import {
  DriveDropOverlay,
  type DriveDropOverlayUploadPhase,
} from '@/src/modules/documents/ui/drive-drop-overlay'
import { UPLOAD_ACCEPT_ATTRIBUTE } from '@/src/modules/portal/domain/upload-policy'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'

const copy = portal.shell.quickInvoice

type PortalQuickInvoiceContextValue = {
  available: boolean
  busy: boolean
  folderName: string | null
  /** Abre directamente el selector de archivos. */
  openPicker: () => void
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

  // El botón solo aparece si el servidor confirma que existe la carpeta de
  // facturas del año; se pregunta una vez, sin bloquear la carga de la página.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void getInvoiceUploadAvailabilityAction()
      .then((result) => {
        if (cancelled) return
        setAvailable(result.available)
        setFolderName(result.folderName ?? null)
      })
      .catch(() => {
        // Sin conexión o pestaña vieja: simplemente no hay botón.
      })
    return () => {
      cancelled = true
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

  const openPicker = useCallback(() => {
    if (!enabled || !available || busy) return
    inputRef.current?.click()
  }, [enabled, available, busy])

  const value = useMemo<PortalQuickInvoiceContextValue>(
    () => ({ available: enabled && available, busy, folderName, openPicker }),
    [enabled, available, busy, folderName, openPicker]
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
        quickInvoice.openPicker()
        onAfterClick?.()
      }}
      disabled={quickInvoice.busy}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? undefined : hint}
      className={cn(
        'group flex w-full cursor-pointer items-center rounded-xl border text-left transition-colors',
        'border-[color:color-mix(in_srgb,var(--turquesa)_35%,transparent)]',
        'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--agua)_70%,transparent),color-mix(in_srgb,var(--agua)_30%,transparent))]',
        'hover:border-[color:color-mix(in_srgb,var(--primary)_60%,transparent)]',
        'hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--agua)_90%,transparent),color-mix(in_srgb,var(--agua)_45%,transparent))]',
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
