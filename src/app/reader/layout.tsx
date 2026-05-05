import { ReaderLayout } from '@/components/layouts/reader-layout'
import { requireReaderAuth } from '@/lib/auth/server-reader-auth'
import { redirect } from 'next/navigation'

export default async function ReaderLayoutWrapper({ children }: { children: React.ReactNode }) {
  try {
    await requireReaderAuth()
  } catch {
    redirect('/')
  }
  return <ReaderLayout>{children}</ReaderLayout>
}
