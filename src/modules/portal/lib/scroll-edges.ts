export type ScrollEdges = { top: boolean; bottom: boolean }

/** Margen (px) para ignorar redondeos de subpíxel del navegador. */
const EDGE_TOLERANCE = 2

/** Si queda contenido oculto por encima (`top`) o por debajo (`bottom`) de la zona visible. */
export function getScrollEdges(metrics: {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}): ScrollEdges {
  const { scrollTop, clientHeight, scrollHeight } = metrics
  return {
    top: scrollTop > EDGE_TOLERANCE,
    bottom: scrollTop + clientHeight < scrollHeight - EDGE_TOLERANCE,
  }
}
