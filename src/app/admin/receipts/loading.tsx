import { PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton cols={6} rows={6} />
    </>
  )
}
