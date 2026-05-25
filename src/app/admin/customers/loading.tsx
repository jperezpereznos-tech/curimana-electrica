import { PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton cols={7} rows={6} />
    </>
  )
}
