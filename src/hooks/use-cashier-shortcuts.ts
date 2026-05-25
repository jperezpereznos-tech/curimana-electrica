'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function useCashierShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    searchInputRef.current = document.querySelector<HTMLInputElement>('input[placeholder*="Suministro"]')
  }, [pathname])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
        return
      }

      if (e.key === 'F2') {
        e.preventDefault()
        router.push('/cashier')
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder*="Suministro"]')
          input?.focus()
        }, 100)
      } else if (e.key === 'F3') {
        e.preventDefault()
        router.push('/cashier/closure')
      } else if (e.key === 'F4') {
        e.preventDefault()
        router.push('/cashier/history')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  return { searchInputRef }
}
