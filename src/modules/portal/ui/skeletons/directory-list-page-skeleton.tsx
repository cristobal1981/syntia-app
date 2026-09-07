import { PortalPageHeaderSkeleton } from '@/src/modules/portal/ui/skeletons/portal-page-header-skeleton'
import { PersonListSkeleton } from '@/src/modules/portal/ui/skeletons/person-list-skeleton'
import { PortalRouteLoadingMarker } from '@/src/modules/portal/ui/portal-route-loading-context'

type DirectoryListPageSkeletonProps = {
  kind: 'gestor' | 'client' | 'worker'
  showAction?: boolean
}

export function DirectoryListPageSkeleton({
  kind,
  showAction = true,
}: DirectoryListPageSkeletonProps) {
  return (
    <>
      <PortalRouteLoadingMarker />
      <div className="flex flex-col gap-6">
        <PortalPageHeaderSkeleton showAction={showAction} />
        <PersonListSkeleton kind={kind} />
      </div>
    </>
  )
}
