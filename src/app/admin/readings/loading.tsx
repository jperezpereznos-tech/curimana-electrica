import { PageHeaderSkeleton, TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton cols={5} rows={6} />
    </>
  )
}
