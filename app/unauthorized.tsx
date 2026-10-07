import { ErrorStage } from '@/components/errors/error-stage'

export default function Unauthorized() {
  return <ErrorStage variant="401" />
}
