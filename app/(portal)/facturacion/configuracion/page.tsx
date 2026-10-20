import { SettingsSection } from '@/src/modules/facturacion/ui/section-views'

// Mock local: la validación de navegación instantánea descarta este segmento (ver «Histórico de Errores» en Notion).
export const instant = false

export default function FacturacionConfiguracionPage() {
  return <SettingsSection />
}
