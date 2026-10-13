'use client'

import { Minus, Plus } from 'lucide-react'

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const
export const DEFAULT_ZOOM_INDEX = 2

type PreviewZoomControlsProps = {
  zoomIndex: number
  onChange: (zoomIndex: number) => void
}

/** Reducir / porcentaje / aumentar: común a la píldora de PDF y a la de imágenes. */
export function PreviewZoomControls({ zoomIndex, onChange }: PreviewZoomControlsProps) {
  const zoom = ZOOM_STEPS[zoomIndex]

  return (
    <>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, zoomIndex - 1))}
        disabled={zoomIndex === 0}
        className="cursor-pointer rounded-full p-1 hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
        aria-label="Reducir zoom"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-10 text-center tabular-nums" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1))}
        disabled={zoomIndex === ZOOM_STEPS.length - 1}
        className="cursor-pointer rounded-full p-1 hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
        aria-label="Aumentar zoom"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </>
  )
}
