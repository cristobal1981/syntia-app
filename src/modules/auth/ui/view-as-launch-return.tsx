import { Sappo } from '@/components/errors/sappo'

/** Gajos del paracaídas, alternando dos tonos: el verde de Sappo se queda para Sappo. */
const ACCENT = 'color-mix(in oklch, var(--service-fiscal) 88%, var(--surface-dark))'
const PANELS = [
  { d: 'M 8 92 C 8 50, 30 20, 58 9 C 44 32, 38 62, 40 98 C 28 100, 16 98, 8 92 Z', fill: ACCENT },
  { d: 'M 58 9 C 74 5, 88 4, 100 4 C 94 30, 92 64, 96 102 C 76 106, 56 104, 40 98 C 38 62, 44 32, 58 9 Z', fill: 'var(--brisa)' },
  { d: 'M 100 4 C 112 4, 126 5, 142 9 C 156 32, 162 62, 160 98 C 144 104, 124 106, 104 102 C 108 64, 106 30, 100 4 Z', fill: ACCENT },
  { d: 'M 142 9 C 170 20, 192 50, 192 92 C 184 98, 172 100, 160 98 C 162 62, 156 32, 142 9 Z', fill: 'var(--brisa)' },
] as const

/** Dónde nace cada raya de caída (% del ancho): suben porque Sappo baja. */
export const FALL_STREAKS = [8, 19, 31, 44, 58, 70, 82, 93] as const

/**
 * Sappo con casco colgado de un paracaídas, para la vuelta de «Ver como cliente». El paracaídas es
 * un SVG propio (cuatro gajos y los cordones hasta la cabeza); Sappo cuelga debajo. Al aterrizar
 * el paracaídas se pliega (ver `view-as-launch.css`).
 */
export function ViewAsReturnScene() {
  return (
    <div className="va-drop" aria-hidden>
      <div className="va-drop-sway">
        <svg className="va-chute" viewBox="0 0 200 150" focusable="false">
          {PANELS.map((panel, i) => (
            <path
              key={i}
              d={panel.d}
              fill={panel.fill}
              stroke="var(--surface-dark)"
              strokeWidth={4}
              strokeLinejoin="round"
            />
          ))}
          {/* Cordones: del borde del paracaídas a la cabeza de Sappo. */}
          <g stroke="var(--brisa)" strokeWidth={2} strokeLinecap="round" opacity={0.85}>
            <line x1={8} y1={94} x2={100} y2={148} />
            <line x1={40} y1={100} x2={100} y2={148} />
            <line x1={100} y1={104} x2={100} y2={148} />
            <line x1={160} y1={100} x2={100} y2={148} />
            <line x1={192} y1={94} x2={100} y2={148} />
          </g>
        </svg>
        <Sappo mood="astronaut" className="va-drop-sappo" />
      </div>
      <span className="va-shadow" />
      <span className="va-dust va-dust-l" />
      <span className="va-dust va-dust-r" />
    </div>
  )
}
