import { redirect } from 'next/navigation'

/** Los datos fiscales del emisor son los del perfil: la antigua pantalla de Facturación lleva ahí. */
export default function FacturacionConfiguracionPage() {
  redirect('/perfil')
}
