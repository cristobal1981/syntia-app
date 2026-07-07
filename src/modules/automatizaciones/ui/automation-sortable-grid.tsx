'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import type { PortalAutomationListItem } from '@/src/modules/automatizaciones/domain/types'
import { AutomationCard } from '@/src/modules/automatizaciones/ui/automation-card'

type SortableAutomationCardProps = {
  automation: PortalAutomationListItem
  configured: boolean
  reorderEnabled: boolean
  onTriggered: () => void
  onEdit?: (automation: PortalAutomationListItem) => void
  onDelete?: (automation: PortalAutomationListItem) => void
}

function SortableAutomationCard({
  automation,
  configured,
  reorderEnabled,
  onTriggered,
  onEdit,
  onDelete,
}: SortableAutomationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: automation.id, disabled: !reorderEnabled })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('h-full', isDragging && 'z-10 opacity-70')}
    >
      <AutomationCard
        automation={automation}
        configured={configured}
        onTriggered={onTriggered}
        dragHandleProps={
          reorderEnabled
            ? { ...attributes, ...listeners }
            : undefined
        }
        onEdit={onEdit ? () => onEdit(automation) : undefined}
        onDelete={onDelete ? () => onDelete(automation) : undefined}
      />
    </li>
  )
}

type AutomationSortableGridProps = {
  automations: PortalAutomationListItem[]
  configured: boolean
  reorderEnabled: boolean
  onTriggered: () => void
  onReorder: (orderedIds: string[]) => void
  onEdit?: (automation: PortalAutomationListItem) => void
  onDelete?: (automation: PortalAutomationListItem) => void
}

export function AutomationSortableGrid({
  automations,
  configured,
  reorderEnabled,
  onTriggered,
  onReorder,
  onEdit,
  onDelete,
}: AutomationSortableGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids = automations.map((automation) => automation.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={automations.map((automation) => automation.id)}
        strategy={rectSortingStrategy}
      >
        <ul
          className={cn(
            'grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3',
            !configured && 'pointer-events-none opacity-60'
          )}
        >
          {automations.map((automation) => (
            <SortableAutomationCard
              key={automation.id}
              automation={automation}
              configured={configured}
              reorderEnabled={reorderEnabled}
              onTriggered={onTriggered}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
