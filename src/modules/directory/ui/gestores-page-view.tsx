'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { listGestoresPageAction } from '@/src/modules/directory/application/directory-queries'
import { DIRECTORY_PAGE_SIZE } from '@/src/modules/directory/domain/types'
import type { DirectoryPageResult, GestorRecord } from '@/src/modules/directory/domain/types'
import { GestorCreateDialog } from '@/src/modules/directory/ui/gestor-create-dialog'
import { PersonEditDialog } from '@/src/modules/directory/ui/person-edit-dialog'
import {
  PersonList,
  type PersonListItem,
} from '@/src/modules/directory/ui/person-list'
import { ListPagination } from '@/src/modules/portal/ui/list-pagination'

type GestoresPageViewProps = {
  initialPage: DirectoryPageResult<GestorRecord>
  clientCounts: Record<string, number>
}

const SEARCH_DEBOUNCE_MS = 300

export function GestoresPageView({ initialPage, clientCounts }: GestoresPageViewProps) {
  const copy = equipo.gestores
  const [result, setResult] = useState(initialPage)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isFetching, startFetchTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPage = useCallback((nextPage: number, nextSearch: string) => {
    startFetchTransition(async () => {
      const next = await listGestoresPageAction({
        page: nextPage,
        pageSize: DIRECTORY_PAGE_SIZE,
        search: nextSearch || undefined,
      })
      setResult(next)
    })
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchPage(1, value)
    }, SEARCH_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    fetchPage(nextPage, search)
  }

  const items: PersonListItem[] = result.items.map((gestor) => ({
    id: gestor.id,
    name: gestor.name,
    email: gestor.email,
    companyName: gestor.companyName,
    status: gestor.status,
    meta: String(clientCounts[gestor.id] ?? 0),
    roleLabel: equipo.roles[gestor.role],
  }))

  const selected = result.items.find((gestor) => gestor.id === selectedId) ?? null

  const handleSaved = useCallback(() => {
    fetchPage(page, search)
  }, [fetchPage, page, search])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {result.totalCount} {copy.countLabel}
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {copy.createButton}
        </Button>
      </header>

      <div
        className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        aria-busy={isFetching}
      >
        <PersonList
          items={items}
          kind="gestor"
          searchPlaceholder={copy.searchPlaceholder}
          emptyTitle={copy.emptyTitle}
          emptyDescription={copy.emptyDescription}
          onSelect={setSelectedId}
          searchValue={search}
          onSearchChange={handleSearchChange}
        />
      </div>

      <ListPagination
        id="gestores-pagination"
        page={page}
        pageSize={DIRECTORY_PAGE_SIZE}
        totalItems={result.totalCount}
        onPageChange={handlePageChange}
      />

      <PersonEditDialog
        kind="gestor"
        open={Boolean(selected)}
        record={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onSaved={handleSaved}
      />

      <GestorCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleSaved}
      />
    </div>
  )
}
