import { KPISkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="animate-pulse rounded-md bg-muted h-8 w-48" />
          <div className="animate-pulse rounded-md bg-muted h-4 w-64" />
        </div>
      </div>
      <KPISkeleton />
    </div>
  )
}
