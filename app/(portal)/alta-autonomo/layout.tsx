import { AltaAutonomoLayoutClient } from '@/src/modules/alta-autonomo/ui/alta-autonomo-layout-client'

export default function AltaAutonomoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col py-6 md:py-8">
      <AltaAutonomoLayoutClient>{children}</AltaAutonomoLayoutClient>
    </div>
  )
}
