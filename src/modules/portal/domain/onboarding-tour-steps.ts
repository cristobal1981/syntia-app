import { portal } from '@/content/portal'

export type OnboardingTourStep = {
  id: string
  selector: string
  title: string
  description: string
  /** Route to navigate to when this step becomes active, if not already there. */
  route?: string
  /** Opens the "Nueva consulta" drawer for real while this step is shown. */
  opensCreateConsulta?: boolean
}

const copy = portal.onboardingTour.steps

const NAV = 'nav[aria-label="Principal"]'

const STEP_ORDER: Array<
  Pick<OnboardingTourStep, 'id' | 'selector' | 'route' | 'opensCreateConsulta'> & {
    id: keyof typeof copy
  }
> = [
  { id: 'home', selector: `${NAV} a[href="/dashboard"]`, route: '/dashboard' },
  { id: 'tramites', selector: `${NAV} a[href="/tramites"]`, route: '/tramites' },
  { id: 'firmas', selector: `${NAV} a[href="/firmas"]`, route: '/firmas' },
  { id: 'guias', selector: `${NAV} a[href="/guias"]`, route: '/guias' },
  {
    id: 'nuevaConsulta',
    selector: '[data-tour="tour-nueva-consulta"]',
    opensCreateConsulta: true,
  },
  { id: 'buscador', selector: 'button[aria-haspopup="dialog"]' },
  { id: 'replay', selector: '[data-tour="tour-replay"]', route: '/perfil' },
]

export function getOnboardingTourSteps(): OnboardingTourStep[] {
  return STEP_ORDER.map(({ id, selector, route, opensCreateConsulta }) => ({
    id,
    selector,
    route,
    opensCreateConsulta,
    title: copy[id].title,
    description: copy[id].description,
  }))
}
