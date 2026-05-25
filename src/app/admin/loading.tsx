import { KPISkeleton, ChartSkeleton, PageHeaderSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton />
      <KPISkeleton />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}
