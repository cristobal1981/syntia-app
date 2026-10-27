'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { equipo } from '@/content/equipo'
import {
  VIEW_AS_LANDING_MS,
  VIEW_AS_LAUNCH_FLIGHT_MS,
  shouldGiveUp,
  shouldLand,
  shouldLaunch,
} from '@/src/modules/auth/domain/view-as-launch'
import {
  endViewAsLaunch,
  landViewAsReturn,
  reportViewAsReturnArrived,
  takeOffViewAsLaunch,
  useViewAsLaunchState,
} from '@/src/modules/auth/ui/view-as-launch-store'
import { FALL_STREAKS, ViewAsReturnScene } from '@/src/modules/auth/ui/view-as-launch-return'
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
  const pathname = usePathname()
  // Ruta en la que estaba al pedir salir: cuando cambia, el panel del equipo ya está pintado.
  const returnFromPath = useRef(pathname)
  const isReturn = state.phase === 'returning' || state.phase === 'landed'

  useEffect(() => {
    // Fuera de la vuelta sigue a la ruta actual; al empezar a volver se queda con la de origen.
    if (state.phase === 'returning') return
    returnFromPath.current = pathname
  }, [pathname, state.phase])

  useEffect(() => {
    if (state.phase === 'returning' && pathname !== returnFromPath.current) {
      reportViewAsReturnArrived()
    }
  }, [pathname, state.phase])

  useEffect(() => {
    if (state.phase !== 'returning') return
    const timer = window.setInterval(() => {
      const now = Date.now()
      if (shouldLand(state, now)) landViewAsReturn()
      else if (shouldGiveUp(state, now)) endViewAsLaunch()
    }, 80)
    return () => window.clearInterval(timer)
  }, [state])

  useEffect(() => {
    if (state.phase !== 'landed') return
    const timer = window.setTimeout(endViewAsLaunch, VIEW_AS_LANDING_MS)
    return () => window.clearTimeout(timer)
  }, [state.phase])

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
      aria-busy={state.phase === 'waiting' || state.phase === 'returning'}
    >
      {isReturn ? (
        <>
          <div className="va-streaks" aria-hidden>
            {FALL_STREAKS.map((left, i) => (
              <span
                key={left}
                className="va-streak"
                style={{ left: `${left}%`, animationDelay: `${(i * 0.29) % 1.2}s` }}
              />
            ))}
          </div>
          <div className="va-stage">
            <ViewAsReturnScene />
            <p className="va-label">{copy.landingLabel}</p>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
