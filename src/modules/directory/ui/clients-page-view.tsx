'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { ClientCreateDialog } from '@/src/modules/directory/ui/client-create-dialog'
import { PersonEditDialog } from '@/src/modules/directory/ui/person-edit-dialog'
import {
  PersonList,
  type PersonListItem,
} from '@/src/modules/directory/ui/person-list'

type ClientsPageViewProps = {
  initialClients: ClientRecord[]
  advisorOptions: Array<{ id: string; name: string }>
  canAssignAdvisor: boolean
}

export function ClientsPageView({
  initialClients,
  advisorOptions,
  canAssignAdvisor,
}: ClientsPageViewProps) {
  const router = useRouter()
  const copy = equipo.clientes
  const clients = initialClients
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const items = useMemo<PersonListItem[]>(
    () =>
      clients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        companyName: client.companyName,
        status: client.status,
        meta: client.advisorName,
      })),
    [clients]
  )

  const selected = clients.find((client) => client.id === selectedId) ?? null

  const handleSaved = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {clients.length} {copy.countLabel}
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {copy.createButton}
        </Button>
      </header>

      <PersonList
        items={items}
        kind="client"
        searchPlaceholder={copy.searchPlaceholder}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDescription}
        onSelect={setSelectedId}
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
