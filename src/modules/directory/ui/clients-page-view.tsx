'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { equipo } from '@/content/equipo'
import { bulkAssignAdvisorAction } from '@/src/modules/directory/application/directory-mutations'
import { listClientsPageAction } from '@/src/modules/directory/application/directory-queries'
import { DIRECTORY_PAGE_SIZE } from '@/src/modules/directory/domain/types'
import type { ClientRecord, DirectoryPageResult } from '@/src/modules/directory/domain/types'
import { ClientCreateDialog } from '@/src/modules/directory/ui/client-create-dialog'
import { PersonEditDialog } from '@/src/modules/directory/ui/person-edit-dialog'
import {
  PersonList,
  type PersonListItem,
} from '@/src/modules/directory/ui/person-list'
import { ListPagination } from '@/src/modules/portal/ui/list-pagination'

type ClientsPageViewProps = {
  initialPage: DirectoryPageResult<ClientRecord>
  advisorOptions: Array<{ id: string; name: string; email: string }>
  canAssignAdvisor: boolean
}

const SEARCH_DEBOUNCE_MS = 300

export function ClientsPageView({
  initialPage,
  advisorOptions,
  canAssignAdvisor,
}: ClientsPageViewProps) {
  const copy = equipo.clientes
  const router = useRouter()
  const searchParams = useSearchParams()
  const [result, setResult] = useState(initialPage)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isFetching, startFetchTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAdvisorId, setBulkAdvisorId] = useState('')
  const [bulkPending, startBulkTransition] = useTransition()
  const bulkCopy = equipo.clientes.bulk
  const formCopy = equipo.form
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPage = useCallback((nextPage: number, nextSearch: string) => {
    startFetchTransition(async () => {
      const next = await listClientsPageAction({
        page: nextPage,
        pageSize: DIRECTORY_PAGE_SIZE,
        search: nextSearch || undefined,
      })
      setResult(next)
      setSelectedIds(new Set())
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

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(q)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    fetchPage(1, q)
    router.replace(canAssignAdvisor ? '/equipo/clientes' : '/clientes', { scroll: false })
  }, [canAssignAdvisor, fetchPage, router, searchParams])

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    fetchPage(nextPage, search)
  }

  const items: PersonListItem[] = result.items.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    companyName: client.companyName,
    status: client.status,
    meta: client.advisorName,
  }))

  const selected = result.items.find((client) => client.id === selectedId) ?? null

  const handleSaved = useCallback(() => {
    fetchPage(page, search)
  }, [fetchPage, page, search])

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((current) => {
      const allSelected = ids.length > 0 && ids.every((id) => current.has(id))
      if (allSelected) {
        const next = new Set(current)
        for (const id of ids) next.delete(id)
        return next
      }
      return new Set([...current, ...ids])
    })
  }

  function handleBulkAssign() {
    if (selectedIds.size === 0) return
    startBulkTransition(async () => {
      const assignResult = await bulkAssignAdvisorAction(
        Array.from(selectedIds),
        bulkAdvisorId || null
      )
      if (!assignResult.ok) {
        toast.error(assignResult.message ?? bulkCopy.assignError)
        return
      }
      toast.success(bulkCopy.assignSuccess)
      setSelectedIds(new Set())
      setBulkAdvisorId('')
      fetchPage(page, search)
    })
  }

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

      {canAssignAdvisor && selectedIds.size > 0 ? (
        <div className="portal-home-card flex flex-wrap items-center gap-3 rounded-xl p-3">
          <p className="text-sm text-foreground">
            {bulkCopy.selectedCount.replace('{count}', String(selectedIds.size))}
          </p>
          <Select value={bulkAdvisorId} onValueChange={setBulkAdvisorId}>
            <SelectTrigger className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm">
              <SelectValue placeholder={bulkCopy.assignAdvisorPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{formCopy.fields.unassigned}</SelectItem>
              {advisorOptions.map((advisor) => (
                <SelectItem key={advisor.id} value={advisor.id}>
                  <span
                    className="block max-w-[min(22rem,70vw)] truncate"
                    title={`${advisor.name} (${advisor.email})`}
                  >
                    {advisor.name}{' '}
                    <span className="text-muted-foreground">({advisor.email})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={handleBulkAssign}
            disabled={bulkPending}
            aria-busy={bulkPending}
          >
            {bulkPending ? bulkCopy.assigning : bulkCopy.assignButton}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkPending}
          >
            {bulkCopy.cancel}
          </Button>
        </div>
      ) : null}

      <div
        className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        aria-busy={isFetching}
      >
        <PersonList
          items={items}
          kind="client"
          searchPlaceholder={copy.searchPlaceholder}
          emptyTitle={copy.emptyTitle}
          emptyDescription={copy.emptyDescription}
          onSelect={setSelectedId}
          selectedIds={canAssignAdvisor ? selectedIds : undefined}
          onToggleSelected={canAssignAdvisor ? toggleSelected : undefined}
          onToggleSelectAll={canAssignAdvisor ? toggleSelectAll : undefined}
          searchValue={search}
          onSearchChange={handleSearchChange}
        />
      </div>

      <ListPagination
        id="clients-pagination"
        page={page}
        pageSize={DIRECTORY_PAGE_SIZE}
        totalItems={result.totalCount}
        onPageChange={handlePageChange}
      />

      <PersonEditDialog
        kind="client"
        open={Boolean(selected)}
        record={selected}
        advisorOptions={advisorOptions}
        canAssignAdvisor={canAssignAdvisor}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onSaved={handleSaved}
      />

      <ClientCreateDialog
        open={createOpen}
        advisorOptions={advisorOptions}
        canAssignAdvisor={canAssignAdvisor}
        onOpenChange={setCreateOpen}
        onCreated={handleSaved}
      />
    </div>
  )
}
