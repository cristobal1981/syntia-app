'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import { ReportProblemDialog } from '@/src/modules/portal/ui/report-problem-dialog'

type PortalReportProblemContextValue = {
  openReportProblem: () => void
}

const PortalReportProblemContext =
  createContext<PortalReportProblemContextValue | null>(null)

export function usePortalReportProblemOptional() {
  return useContext(PortalReportProblemContext)
}

type PortalReportProblemProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function PortalReportProblemProvider({
  children,
  enabled,
}: PortalReportProblemProviderProps) {
  const [open, setOpen] = useState(false)

  return (
    <PortalReportProblemContext.Provider
      value={{ openReportProblem: () => setOpen(true) }}
    >
      {children}
      {enabled ? <ReportProblemDialog open={open} onOpenChange={setOpen} /> : null}
    </PortalReportProblemContext.Provider>
  )
}
