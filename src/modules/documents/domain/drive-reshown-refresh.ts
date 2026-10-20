/**
 * Con Cache Components una ruta que se abandona queda oculta (`<Activity>`),
 * no desmontada: sus efectos se limpian y su estado se conserva. Un aviso
 * recibido mientras estaba oculta (p. ej. una subida rápida de factura) se
 * pierde, y al volver el listado sería el de antes. Esta puerta recuerda si
 * el efecto del aviso se limpió, para refrescar en cuanto vuelve a montarse.
 */
export function createReshownRefreshGate() {
  let wasHidden = false

  return {
    /** El efecto se limpió: la ruta pasó a oculta o se desmonta. */
    markHidden() {
      wasHidden = true
    },
    /** El efecto se montó; `true` si antes estuvo oculto y pudo perderse un aviso. */
    consumeReshown(): boolean {
      const reshown = wasHidden
      wasHidden = false
      return reshown
    },
  }
}
