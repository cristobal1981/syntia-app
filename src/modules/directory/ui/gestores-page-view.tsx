'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { equipo } from '@/content/equipo'
import type { GestorRecord } from '@/src/modules/directory/domain/types'
import { GestorCreateDialog } from '@/src/modules/directory/ui/gestor-create-dialog'
import { PersonEditDialog } from '@/src/modules/directory/ui/person-edit-dialog'
import {
  PersonList,
  type PersonListItem,
} from '@/src/modules/directory/ui/person-list'
import { Button } from '@/components/ui/button'

type GestoresPageViewProps = {
  initialGestores: GestorRecord[]
}

export function GestoresPageView({
  initialGestores,
}: GestoresPageViewProps) {
  const router = useRouter()
  const copy = equipo.gestores
  const [gestores, setGestores] = useState(initialGestores)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setGestores(initialGestores)
  }, [initialGestores])

  const items = useMemo<PersonListItem[]>(
    () =>
      gestores.map((gestor) => ({
        id: gestor.id,
        name: gestor.name,
        email: gestor.email,
        companyName: gestor.companyName,
        status: gestor.status,
        roleLabel: equipo.roles[gestor.role],
      })),
    [gestores]
  )

  const selected = gestores.find((gestor) => gestor.id === selectedId) ?? null

  const handleSaved = useCallback(() => {
    router.refresh()
    setGestores((current) => [...current])
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
            {gestores.length} {copy.countLabel}
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {copy.createButton}
        </Button>
      </header>

      <PersonList
        items={items}
        kind="gestor"
        searchPlaceholder={copy.searchPlaceholder}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDescription}
        onSelect={setSelectedId}
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
