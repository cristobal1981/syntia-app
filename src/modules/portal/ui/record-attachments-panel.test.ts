import { describe, expect, it, vi } from 'vitest'

vi.mock('@/src/modules/portal/application/portal-document-actions', () => ({
  getRecordAttachmentsAction: vi.fn(),
  downloadRecordAttachmentAction: vi.fn(),
}))

import { shouldReportResolvedCount } from '@/src/modules/portal/ui/record-attachments-panel'

describe('shouldReportResolvedCount', () => {
  it('avisa cuando la lista del servidor tiene más o menos documentos que el contador', () => {
    expect(shouldReportResolvedCount(2, 3)).toBe(true)
    expect(shouldReportResolvedCount(3, 2)).toBe(true)
    expect(shouldReportResolvedCount(0, 1)).toBe(true)
  })

  it('no avisa si coinciden ni si no hay contador que contradecir', () => {
    expect(shouldReportResolvedCount(3, 3)).toBe(false)
    expect(shouldReportResolvedCount(0, 0)).toBe(false)
    expect(shouldReportResolvedCount(undefined, 3)).toBe(false)
  })
})
