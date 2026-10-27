'use client'

import { useEffect } from 'react'

import { equipo } from '@/content/equipo'
import {
  VIEW_AS_LAUNCH_FLIGHT_MS,
  shouldGiveUp,
  shouldLaunch,
} from '@/src/modules/auth/domain/view-as-launch'
import {
  endViewAsLaunch,
  takeOffViewAsLaunch,
  useViewAsLaunchState,
} from '@/src/modules/auth/ui/view-as-launch-store'
import { ViewAsLaunchRocket } from '@/src/modules/auth/ui/view-as-launch-rocket'
import './view-as-launch.css'

/** Dónde nace cada raya (% del ancho y del alto): por arriba y por la derecha, para cruzar hacia abajo a la izquierda. */
const STARS = [
  { left: 22, top: -6 },
  { left: 41, top: -6 },
  { left: 58, top: -6 },
  { left: 76, top: -6 },
  { left: 92, top: -6 },
  { left: 104, top: 10 },
  { left: 104, top: 32 },
  { left: 104, top: 56 },
  { left: 104, top: 80 },
] as const

/**
 * Pantalla del despegue, montada en el layout raíz para sobrevivir a la navegación desde el panel
 * del equipo al portal del cliente. Despega cuando el portal ya está pintado y se ha visto un
 * mínimo; si algo falla y no llega a pintarse, se quita sola.
 */
export function ViewAsLaunchHost() {
  const state = useViewAsLaunchState()
  const copy = equipo.form.viewAsSection

  useEffect(() => {
    if (state.phase !== 'waiting') return
    const timer = window.setInterval(() => {
      const now = Date.now()
      if (shouldLaunch(state, now)) takeOffViewAsLaunch()
      else if (shouldGiveUp(state, now)) endViewAsLaunch()
    }, 80)
    return () => window.clearInterval(timer)
  }, [state])

  useEffect(() => {
    if (state.phase !== 'launching') return
    const timer = window.setTimeout(endViewAsLaunch, VIEW_AS_LAUNCH_FLIGHT_MS + 520)
    return () => window.clearTimeout(timer)
  }, [state.phase])

  if (state.phase === 'idle') return null

  return (
    <div
      className="va-overlay"
      data-phase={state.phase}
      role="status"
      aria-live="polite"
      aria-busy={state.phase === 'waiting'}
    >
      <div className="va-stars" aria-hidden>
        {STARS.map((star, i) => (
          <span
            key={`${star.left}-${star.top}`}
            className="va-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${(i * 0.37) % 1.8}s`,
            }}
          />
        ))}
      </div>
      <div className="va-stage">
        <ViewAsLaunchRocket />
        <p className="va-label">{copy.launchLabel}</p>
      </div>
    </div>
  )
}
