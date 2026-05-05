import { AdminLayout } from '@/components/layouts/admin-layout'
import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminAuth()
  } catch {
    redirect('/')
  }
  return <AdminLayout>{children}</AdminLayout>
}
