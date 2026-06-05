export const notImplementedPath = "/proximamente" as const

export const errorPages = {
  404: {
    code: "404",
    title: "Esta página no está en el balance",
    description:
      "Hemos buscado en todas las cuentas y esta URL no aparece por ningún lado. Puede que el enlace esté desactualizado o que hayas escrito mal la dirección.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/6549358/pexels-photo-6549358.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Profesional revisando documentos con expresión pensativa",
  },
  400: {
    code: "400",
    title: "Esta petición no cuadra",
    description:
      "Algo en lo que has enviado no encaja con lo que esperamos — como una fila en Excel que no suma. Revisa la dirección o inténtalo de nuevo.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Calculadora y papeles sobre un escritorio",
  },
  500: {
    code: "500",
    title: "Pausa café involuntaria",
    description:
      "Nuestros servidores han tomado un respiro inesperado. No es culpa tuya: estamos en ello. Si el problema persiste, escríbenos y lo revisamos con calma.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Taza de café sobre una mesa",
  },
  wip: {
    code: "Próximamente",
    title: "Estamos preparando este expediente",
    description:
      "Esta sección aún está en desarrollo. Muy pronto estará disponible; mientras tanto, puedes volver al inicio o escribirnos si necesitas algo urgente.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Equipo planificando en una pizarra en la oficina",
  },
} as const
