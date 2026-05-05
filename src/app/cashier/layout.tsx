import { CashierLayout } from '@/components/layouts/cashier-layout'
import { requireCashierAuth } from '@/lib/auth/server-cashier-auth'
import { redirect } from 'next/navigation'

export default async function CashierLayoutWrapper({ children }: { children: React.ReactNode }) {
  try {
    await requireCashierAuth()
  } catch {
    redirect('/')
  }
  return <CashierLayout>{children}</CashierLayout>
}
