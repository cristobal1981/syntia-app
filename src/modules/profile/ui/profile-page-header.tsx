import { profile } from '@/content/profile'

/**
 * Cabecera de Perfil: el título «Perfil» solo lo leen los lectores de pantalla; a la vista manda la
 * identidad del cliente, que llega con los datos.
 */
export function ProfilePageHeader() {
  return (
    // `sr-only` en la cabecera (no solo en el h1): así no cuenta como elemento del flex y no deja hueco.
    <header className="sr-only">
      <h1>{profile.pageTitle}</h1>
    </header>
  )
}
