/**
 * Feedback visual mientras se trae un mensaje ya detectado (el poll de
 * novedades confirmó que existe, se está pidiendo el contenido). Nunca se
 * sabe de antemano quién escribió, pero solo se dispara para mensajes de
 * terceros (ver record-chatter-panel.tsx), así que se usa la burbuja del
 * asesor.
 */
export function ChatterTypingIndicator() {
  return (
    <li className="flex items-end gap-1.5" aria-hidden="true">
      <article className="chatter-advisor-bubble flex items-center gap-1 rounded-2xl rounded-bl-none px-3 py-2.5">
        <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60" />
      </article>
    </li>
  )
}
