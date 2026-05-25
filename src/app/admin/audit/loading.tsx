import { PageHeaderSkeleton, CardListSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CardListSkeleton count={8} />
    </>
  )
}
