import { redirect } from 'next/navigation'

/** `/facturacion` lleva al panel; el layout ya cierra el acceso fuera de local. */
export default function FacturacionIndexPage() {
  redirect('/facturacion/panel')
}
