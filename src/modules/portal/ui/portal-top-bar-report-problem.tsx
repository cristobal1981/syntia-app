'use client'

import { Bug } from 'lucide-react'

import { portal } from '@/content/portal'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { usePortalReportProblemOptional } from '@/src/modules/portal/ui/portal-report-problem-context'

const copy = portal.shell.reportProblem

export function PortalTopBarReportProblem() {
  const reportProblem = usePortalReportProblemOptional()

  if (!reportProblem) {
    return null
  }

  return (
    <PortalActionTooltip content={copy.label}>
      <button
        type="button"
        onClick={reportProblem.openReportProblem}
        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={copy.label}
      >
        <Bug className="size-[1.125rem]" aria-hidden />
      </button>
    </PortalActionTooltip>
  )
}
