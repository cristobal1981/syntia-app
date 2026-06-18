import { PortalPageHeaderSkeleton } from '@/src/modules/portal/ui/skeletons/portal-page-header-skeleton'
import { PersonListSkeleton } from '@/src/modules/portal/ui/skeletons/person-list-skeleton'

type DirectoryListPageSkeletonProps = {
  kind: 'gestor' | 'client'
}

export function DirectoryListPageSkeleton({ kind }: DirectoryListPageSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton showAction />
      <PersonListSkeleton kind={kind} />
    </div>
  )
}
