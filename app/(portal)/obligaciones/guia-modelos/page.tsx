import { redirect } from 'next/navigation'

// La guía de modelos vive ahora en el hub de guías; el destino re-valida sesión y rol.
export default function FiscalModelsGuideRoutePage() {
  redirect('/guias/modelos-aeat')
}
