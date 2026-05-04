import { AdminLayout } from '@/components/layouts/admin-layout'

export default function ReadingsLoading() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <div className="h-9 w-48 mb-2 bg-muted rounded" />
          <div className="h-4 w-80 bg-muted rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-8 w-56 bg-muted rounded" />
        </div>
        <div className="h-96 w-full bg-muted rounded" />
      </div>
    </AdminLayout>
  )
}
