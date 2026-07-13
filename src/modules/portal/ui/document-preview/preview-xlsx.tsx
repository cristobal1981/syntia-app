'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

import { portalDocuments } from '@/content/portal-documents'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'
import { cn } from '@/lib/utils'

const MAX_PREVIEW_ROWS = 200
const MAX_PREVIEW_COLS = 26

type PreviewXlsxProps = {
  dataBase64: string
  fallbackMessage: string
}

type WorkbookSheet = {
  name: string
  rows: string[][]
}

type ParsedWorkbook = {
  sheets: WorkbookSheet[]
}

function parseSheetRows(sheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][]

  return matrix
    .slice(0, MAX_PREVIEW_ROWS)
    .map((row) => row.slice(0, MAX_PREVIEW_COLS).map((cell) => String(cell ?? '')))
    .filter((row) => row.some((cell) => cell.trim().length > 0))
}

function parseWorkbook(dataBase64: string): ParsedWorkbook | null {
  const workbook = XLSX.read(dataBase64, { type: 'base64' })
  if (!workbook.SheetNames.length) return null

  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: parseSheetRows(workbook.Sheets[name]),
  }))

  if (!sheets.some((sheet) => sheet.rows.length > 0)) return null

  return { sheets }
}

function normalizeMatrix(rows: string[][]) {
  if (!rows.length) {
    return { headerRow: [] as string[], bodyRows: [] as string[][], colCount: 0 }
  }

  const maxCols = Math.max(...rows.map((row) => row.length), 1)
  const normalized = rows.map((row) => {
    const copy = [...row]
    while (copy.length < maxCols) copy.push('')
    return copy
  })

  if (normalized.length === 1) {
    return {
      headerRow: normalized[0].map((_, index) => `Col ${index + 1}`),
      bodyRows: normalized,
      colCount: maxCols,
    }
  }

  return {
    headerRow: normalized[0],
    bodyRows: normalized.slice(1),
    colCount: maxCols,
  }
}

type PreviewXlsxTableProps = {
  headerRow: string[]
  bodyRows: string[][]
  colCount: number
}

function PreviewXlsxTable({ headerRow, bodyRows, colCount }: PreviewXlsxTableProps) {
  return (
    <table className="w-full min-w-max border-collapse text-sm text-neutral-900">
      <thead className="sticky top-0 z-10 bg-neutral-100">
        <tr>
          {headerRow.map((cell, index) => (
            <th
              key={`header-${index}`}
              className="border-b border-neutral-200 px-3 py-2 text-left font-medium text-neutral-900"
            >
              {cell || `Col ${index + 1}`}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyRows.map((row, rowIndex) => (
          <tr
            key={`row-${rowIndex}`}
            className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
          >
            {Array.from({ length: colCount }, (_, colIndex) => (
              <td
                key={`cell-${rowIndex}-${colIndex}`}
                className="border-b border-neutral-200 px-3 py-2 align-top tabular-nums text-neutral-900"
              >
                {row[colIndex] ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type PreviewXlsxSheetTabsProps = {
  sheets: WorkbookSheet[]
  activeIndex: number
  onChange: (index: number) => void
}

function PreviewXlsxSheetTabs({
  sheets,
  activeIndex,
  onChange,
}: PreviewXlsxSheetTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={portalDocuments.previewXlsxSheetsLabel}
      className={cn(
        'flex shrink-0 gap-1 overflow-x-auto rounded-t-lg border border-border border-b-0',
        'bg-muted/90 p-1.5 dark:bg-muted/50'
      )}
    >
      {sheets.map((sheet, index) => {
        const selected = activeIndex === index
        const panelId = `preview-xlsx-sheet-${index}`

        return (
          <button
            key={`${sheet.name}-${index}`}
            type="button"
            role="tab"
            id={`preview-xlsx-sheet-trigger-${index}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            title={sheet.name}
            onClick={() => onChange(index)}
            className={cn(
              'inline-flex max-w-[14rem] shrink-0 cursor-pointer items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted',
              'sm:text-sm',
              selected
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border dark:bg-card dark:text-foreground dark:ring-border/80'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-card/70 dark:hover:text-foreground'
            )}
          >
            <span className="truncate">{sheet.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function PreviewXlsx({ dataBase64, fallbackMessage }: PreviewXlsxProps) {
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    setWorkbook(null)
    setActiveSheetIndex(0)
    setError(false)

    try {
      const parsed = parseWorkbook(dataBase64)
      if (!parsed) {
        setError(true)
        return
      }
      setWorkbook(parsed)
    } catch {
      setError(true)
    }
  }, [dataBase64])

  const activeSheet = workbook?.sheets[activeSheetIndex]

  const { headerRow, bodyRows, colCount } = useMemo(
    () => normalizeMatrix(activeSheet?.rows ?? []),
    [activeSheet]
  )

  if (error) {
    return <PreviewFallback message={fallbackMessage} />
  }

  if (!workbook || !activeSheet) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        {portalDocuments.previewLoading}
      </p>
    )
  }

  const hasMultipleSheets = workbook.sheets.length > 1
  const panelId = `preview-xlsx-sheet-${activeSheetIndex}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasMultipleSheets ? (
        <PreviewXlsxSheetTabs
          sheets={workbook.sheets}
          activeIndex={activeSheetIndex}
          onChange={setActiveSheetIndex}
        />
      ) : null}

      <div
        role="tabpanel"
        id={hasMultipleSheets ? panelId : undefined}
        aria-labelledby={
          hasMultipleSheets
            ? `preview-xlsx-sheet-trigger-${activeSheetIndex}`
            : undefined
        }
        className={cn(
          'min-h-0 flex-1 overflow-auto border border-neutral-200 bg-white',
          hasMultipleSheets ? 'rounded-b-lg' : 'rounded-lg'
        )}
      >
        {activeSheet.rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-600">
            {portalDocuments.previewXlsxEmptySheet}
          </p>
        ) : (
          <PreviewXlsxTable
            headerRow={headerRow}
            bodyRows={bodyRows}
            colCount={colCount}
          />
        )}
      </div>
    </div>
  )
}
