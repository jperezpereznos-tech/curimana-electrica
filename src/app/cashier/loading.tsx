import { PageHeaderSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="animate-pulse rounded-md bg-muted h-12 w-full max-w-xl" />
      <div className="animate-pulse rounded-lg bg-muted h-48 w-full" />
    </div>
  )
}
