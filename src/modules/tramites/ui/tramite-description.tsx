'use client'

import { useEffect, useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { tramites } from '@/content/tramites'
import { cn } from '@/lib/utils'
import { loadDrawerBundle, readDrawerBundle } from '@/src/modules/portal/ui/record-drawer-bundle'
import { prepareChatterHtmlForDisplay } from '@/src/modules/portal/ui/sanitize-chatter-html.client'

type TramiteDescriptionProps = {
  taskId: number
}

/**
 * «Ver descripción» bajo el título del drawer: información de consulta
 * ocasional, así que va plegada y, si la tarea no tiene descripción (o falla
 * la lectura), no se pinta nada. Se pide al abrir el drawer, no en el listado, junto con el
 * chat (misma petición) y se reutiliza si ya se había visto.
 * El padre la monta con `key` por trámite para reiniciar el estado.
 */
export function TramiteDescription({ taskId }: TramiteDescriptionProps) {
  const [html, setHtml] = useState<string | null>(
    () => readDrawerBundle('task', taskId)?.description ?? null
  )
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  useEffect(() => {
    let cancelled = false
    if (readDrawerBundle('task', taskId)?.description !== undefined) return
    void loadDrawerBundle('task', taskId)
      .then((result) => {
        if (!cancelled && result.ok) setHtml(result.description)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [taskId])

  if (!html) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
        className="flex cursor-pointer items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', expanded && 'rotate-90')}
          aria-hidden
        />
        {expanded ? tramites.taskDescription.hide : tramites.taskDescription.show}
      </button>
      {expanded ? (
        <div
          id={panelId}
          className="mt-1.5 max-h-48 overflow-y-auto rounded-md bg-muted/50 px-3 py-2 text-sm break-words text-foreground/90 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_p+p]:mt-2 [&_s]:line-through [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: prepareChatterHtmlForDisplay(html) }}
        />
      ) : null}
    </div>
  )
}
