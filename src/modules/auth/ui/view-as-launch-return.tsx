import { Sappo } from '@/components/errors/sappo'

/** Gajos del paracaídas, alternando dos tonos: el verde de Sappo se queda para Sappo. */
const ACCENT = 'color-mix(in oklch, var(--service-fiscal) 88%, var(--surface-dark))'
const PANELS = [
  { d: 'M 8 92 C 8 50, 30 20, 58 9 C 44 32, 38 62, 40 98 C 28 100, 16 98, 8 92 Z', fill: ACCENT },
  { d: 'M 58 9 C 74 5, 88 4, 100 4 C 94 30, 92 64, 96 102 C 76 106, 56 104, 40 98 C 38 62, 44 32, 58 9 Z', fill: 'var(--brisa)' },
  { d: 'M 100 4 C 112 4, 126 5, 142 9 C 156 32, 162 62, 160 98 C 144 104, 124 106, 104 102 C 108 64, 106 30, 100 4 Z', fill: ACCENT },
  { d: 'M 142 9 C 170 20, 192 50, 192 92 C 184 98, 172 100, 160 98 C 162 62, 156 32, 142 9 Z', fill: 'var(--brisa)' },
] as const

/** Estrellas del cielo (% del ancho y del alto) con su retraso de parpadeo. */
const SKY_STARS = [
  { x: 8, y: 9, d: 0 },
  { x: 17, y: 24, d: 0.7 },
  { x: 26, y: 6, d: 1.3 },
  { x: 36, y: 17, d: 0.3 },
  { x: 47, y: 8, d: 1.1 },
  { x: 58, y: 21, d: 0.5 },
  { x: 67, y: 7, d: 1.6 },
  { x: 76, y: 28, d: 0.9 },
  { x: 86, y: 14, d: 0.2 },
  { x: 93, y: 31, d: 1.4 },
  { x: 12, y: 38, d: 1.0 },
  { x: 41, y: 33, d: 1.8 },
] as const

/** Salpicaduras del chapuzón: hacia dónde sale cada gota (rem). */
const DROPLETS = [
  { dx: -5.2, dy: -4.2 },
  { dx: -3.4, dy: -6.1 },
  { dx: -1.4, dy: -7 },
  { dx: 1.4, dy: -7 },
  { dx: 3.4, dy: -6.1 },
  { dx: 5.2, dy: -4.2 },
  { dx: -6.4, dy: -2.4 },
  { dx: 6.4, dy: -2.4 },
] as const

/**
 * Vuelta de «Ver como cliente»: Sappo con casco baja en paracaídas por un cielo de noche con luna y
 * aterriza en la charca (la de las páginas de error). Al tocar el agua: chapuzón, pulso de ondas que
 * cruza la charca, salpicaduras, y el paracaídas se queda flotando y se hunde. Los tiempos y los
 * efectos están en `view-as-launch.css` (fases `returning` y `landed`).
 */
export function ViewAsReturnScene({ label }: { label: string }) {
  return (
    <div className="va-return" aria-hidden>
      <div className="va-sky">
        <span className="va-moon" />
        {SKY_STARS.map((star) => (
          <span
            key={`${star.x}-${star.y}`}
            className="va-twinkle"
            style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.d}s` }}
          />
        ))}
        <span className="va-cloud va-cloud-a" />
        <span className="va-cloud va-cloud-b" />
      </div>

      <div className="va-pond">
        <span className="va-reflection" />
        {/* Ondas lentas de la charca en reposo. */}
        <span className="va-idle-wave" />
        <span className="va-idle-wave va-idle-wave-late" />
      </div>

      {/* Punto de aterrizaje: todo lo del agua nace aquí. */}
      <div className="va-spot">
        <span className="va-wave va-wave-1" />
        <span className="va-wave va-wave-2" />
        <span className="va-wave va-wave-3" />
        <span className="va-shockwave" />

        <div className="va-drop">
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
            <div className="va-sappo-wrap">
              <Sappo mood="astronaut" className="va-drop-sappo" />
              {/* El agua tapa los pies: Sappo queda dentro de la charca. */}
              <span className="va-water-front" />
            </div>
          </div>
        </div>

        {DROPLETS.map((drop, i) => (
          <span
            key={i}
            className="va-droplet"
            style={
              {
                '--dx': `${drop.dx}rem`,
                '--dy': `${drop.dy}rem`,
                animationDelay: `${(i % 3) * 0.04}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <p className="va-label va-return-label">{label}</p>
    </div>
  )
}
