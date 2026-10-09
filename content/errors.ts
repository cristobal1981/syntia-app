export const notImplementedPath = "/proximamente" as const

export type SappoMood =
  | "lost"
  | "confused"
  | "sleepy"
  | "guard"
  | "dizzy"
  | "builder"
  // Compañero de la app (no de las páginas de error).
  | "lawyer"
  | "conductor"
  | "carrier"
  | "cheer"
  | "oops"

type ErrorAction = { label: string; href: string }

export type ErrorVariant = {
  /** Texto fantasma a ambos lados de Sappo; Sappo ocupa el hueco de la "o"/"0". */
  ghost: readonly [string, string]
  /** Texto accesible del código (el fantasma es decorativo y va aria-hidden). */
  eyebrow: string
  title: string
  description: string
  mood: SappoMood
  /** Frases del bocadillo de Sappo; la primera sale sola al cargar. */
  croaks: readonly string[]
  primary: ErrorAction
  /** Si hay `onRetry`, el reintento sustituye a la acción primaria. */
  retryLabel?: string
  secondary?: ErrorAction
}

const home = { label: "Volver al inicio", href: "/" } as const

export const errorPages = {
  400: {
    ghost: ["4", "0"],
    eyebrow: "Error 400 · Petición incorrecta",
    title: "Sappo ha ladeado la cabeza: esa petición no tiene sentido",
    description:
      "Algo en la dirección o en los datos enviados no tiene el formato esperado. Vuelve al inicio e inténtalo de nuevo.",
    mood: "confused",
    croaks: [
      "¿Croac…?",
      "Eso no estaba en el menú.",
      "Repite, que me he distraído con una mosca.",
    ],
    primary: home,
  },
  401: {
    ghost: ["4", "1"],
    eyebrow: "Error 401 · Sesión no iniciada",
    title: "Tu sesión se ha dormido. Sappo también",
    description:
      "Por seguridad cerramos la sesión cuando pasa un rato sin actividad. Inicia sesión de nuevo para continuar.",
    mood: "sleepy",
    croaks: [
      "Zzz… cro… zzz…",
      "¿Eh? Cinco minutitos más…",
      "Shhh. Está soñando con moscas.",
    ],
    primary: { label: "Iniciar sesión", href: "/login" },
  },
  403: {
    ghost: ["4", "3"],
    eyebrow: "Error 403 · Acceso restringido",
    title: "Zona reservada. Sappo hace de portero",
    description:
      "Tu cuenta no tiene permiso para ver esta sección. Si crees que es un error, escribe a tu asesor y lo revisamos.",
    mood: "guard",
    croaks: [
      "Tu nombre no está en la lista.",
      "Con estas gafas no admito sobornos.",
      "Pregunta a tu asesor. Yo solo croo.",
    ],
    primary: home,
  },
  404: {
    ghost: ["4", "4"],
    eyebrow: "Error 404 · Página no encontrada",
    title: "Esta página no existe. Sappo ya ha mirado debajo de todos los nenúfares",
    description:
      "Puede que el enlace esté roto o que la página se haya mudado de charca. Vuelve al inicio y lo buscamos desde allí.",
    mood: "lost",
    croaks: [
      "Croac. Aquí no hay nada.",
      "He mirado en el nenúfar. Y en el otro.",
      "¿Seguro que era esta dirección?",
    ],
    primary: home,
  },
  500: {
    ghost: ["5", "0"],
    eyebrow: "Error 500 · Fallo del servidor",
    title: "Algo ha petado de nuestro lado. Sappo está mareado",
    description:
      "No es culpa tuya. Puedes intentarlo otra vez o volver al inicio; si el fallo persiste, indícale a tu asesor el código de referencia.",
    mood: "dizzy",
    croaks: [
      "Croac… todo da vueltas.",
      "He apagado y encendido el nenúfar.",
      "Dame un segundo, que me recoloco.",
    ],
    primary: home,
    retryLabel: "Intentar de nuevo",
  },
  fatal: {
    ghost: ["5", "0"],
    eyebrow: "Error crítico · Syntia no ha podido arrancar",
    title: "Esto es más que un mareo: Sappo se ha desmayado",
    description:
      "Ha fallado algo importante antes de poder mostrarte la página. Recárgala; si sigue igual, vuelve a intentarlo en unos minutos.",
    mood: "dizzy",
    croaks: [
      "Croac… ¿quién ha apagado la charca?",
      "Reinicio de emergencia en curso.",
    ],
    primary: home,
    retryLabel: "Recargar",
  },
  wip: {
    ghost: ["PR", "NTO"],
    eyebrow: "Próximamente",
    title: "Obras en la charca. Sappo se ha puesto el casco",
    description:
      "Esta sección aún no está lista. Muy pronto estará disponible; mientras tanto, vuelve al inicio o escríbenos si necesitas algo urgente.",
    mood: "builder",
    croaks: [
      "Croac. Casco puesto, ladrillo no.",
      "Esto lleva más cemento del que parece.",
      "Vuelve pronto. Prometido.",
    ],
    primary: home,
  },
} as const satisfies Record<string, ErrorVariant>

export type ErrorVariantKey = `${keyof typeof errorPages}`
