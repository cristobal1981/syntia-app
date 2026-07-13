export const notImplementedPath = "/proximamente" as const

export const errorPages = {
  404: {
    code: "404",
    title: "Ruta no encontrada en el mapa",
    description:
      "No hemos encontrado lo que buscabas, pero el logo sigue rebotando. Quédate a ver si toca justo la esquina — no se lo contaremos a nadie 😉.",
    playHint: "Modo salvapantallas activado. La esquina perfecta lleva años esperando.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/6549358/pexels-photo-6549358.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Profesional revisando documentos con expresión pensativa",
  },
  400: {
    code: "400",
    title: "Petición fuera de formato",
    description:
      "Lo que nos has mandado no encaja en ningún molde conocido — como un Excel con las columnas en diagonal. Puedes desahogarte empujando los nodos.",
    playHint: "Acércate con el cursor: los nodos huyen. Pulsa para descargar tensión.",
    primaryLabel: "Volver al inicio",
    primaryHref: "/",
    image:
      "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1920",
    imageAlt: "Calculadora y papeles sobre un escritorio",
  },
  500: {
    code: "500",
    title: "Pausa técnica no programada",
    description:
      "Nuestros servidores han dicho «basta un segundo». Dale un toque al fondo para intentar despertarlos — nosotros también lo estamos haciendo.",
    playHint: "Pulsa para enviar un pulso de reinicio. La red tiembla sola de vez en cuando.",
    retryLabel: "Intentar de nuevo",
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
