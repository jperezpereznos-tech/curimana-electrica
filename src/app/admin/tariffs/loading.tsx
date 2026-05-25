import { PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton cols={4} rows={4} />
    </>
  )
}
