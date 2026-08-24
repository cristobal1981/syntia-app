'use server'

import { formatOdooHtmlDocument, type OdooHtmlFieldRow } from '@/lib/format/odoo-html'
import { portal } from '@/content/portal'
import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { createReportProblemTicket } from '@/src/modules/portal/infrastructure/odoo-report-problem-repository'

const PROBLEM_MAX_LENGTH = 2000
const STEPS_MAX_LENGTH = 1000
const ERROR_MAX_LENGTH = 1000

const areaCopy = portal.shell.reportProblem.areas
type ReportProblemArea = keyof typeof areaCopy

function isValidArea(value: string): value is ReportProblemArea {
  return Object.prototype.hasOwnProperty.call(areaCopy, value)
}

export type ReportProblemInput = {
  area: string
  problem: string
  steps: string
  errorShown: string
  pathname: string
  userAgent: string
}

export type ReportProblemResult =
  | { ok: true; ticketId: number }
  | {
      ok: false
      error: 'forbidden' | 'odoo_unavailable' | 'validation' | 'create_failed'
      fieldErrors?: Record<string, string>
    }

export async function reportProblemAction(
  input: ReportProblemInput
): Promise<ReportProblemResult> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const area = input.area.trim()
  const problem = input.problem.trim()
  const steps = input.steps.trim()
  const errorShown = input.errorShown.trim()

  const fieldErrors: Record<string, string> = {}
  if (!isValidArea(area)) {
    fieldErrors.area = 'areaRequired'
  }
  if (!problem) {
    fieldErrors.problem = 'problemRequired'
  } else if (problem.length > PROBLEM_MAX_LENGTH) {
    fieldErrors.problem = 'problemTooLong'
  }
  if (steps.length > STEPS_MAX_LENGTH) {
    fieldErrors.steps = 'stepsTooLong'
  }
  if (errorShown.length > ERROR_MAX_LENGTH) {
    fieldErrors.errorShown = 'errorShownTooLong'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  const areaLabel = areaCopy[area as ReportProblemArea]
  const name = `Problema reportado: ${areaLabel}`

  const detailRows: OdooHtmlFieldRow[] = [
    { label: 'Apartado afectado', value: areaLabel },
    { label: 'Descripción del problema', value: problem },
  ]
  if (steps) detailRows.push({ label: 'Pasos para reproducirlo', value: steps })
  if (errorShown) detailRows.push({ label: 'Error mostrado', value: errorShown })

  const contextRows: OdooHtmlFieldRow[] = [
    { label: 'Reportado por', value: `${session.user.name} (${session.user.email})` },
    { label: 'Página', value: input.pathname },
    { label: 'Navegador', value: input.userAgent },
  ]

  const descriptionHtml = formatOdooHtmlDocument({
    title: 'Problema reportado desde el portal Syntia',
    sections: [
      { title: 'Detalle', rows: detailRows },
      { title: 'Contexto', rows: contextRows },
    ],
  })

  try {
    const ticketId = await createReportProblemTicket({
      name,
      descriptionHtml,
      reporterName: session.user.name,
      reporterEmail: session.user.email,
    })

    return { ok: true, ticketId }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_TICKET_TEAM_NOT_CONFIGURED') {
        return { ok: false, error: 'odoo_unavailable' }
      }
      if (error.message === 'ODOO_TICKET_CREATE_FAILED') {
        return { ok: false, error: 'create_failed' }
      }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }
}
