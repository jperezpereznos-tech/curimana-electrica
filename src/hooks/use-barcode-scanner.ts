'use client'

import { useEffect, useRef, useCallback } from 'react'

export function useBarcodeScanner(onScan: (barcode: string) => void, { minLength = 3, maxInterval = 50 }: { minLength?: number; maxInterval?: number } = {}) {
  const buffer = useRef('')
  const lastKeyTime = useRef(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const now = Date.now()

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    if (e.key === 'Enter') {
      if (buffer.current.length >= minLength && (now - lastKeyTime.current) < maxInterval * buffer.current.length) {
        e.preventDefault()
        onScan(buffer.current.trim())
      }
      buffer.current = ''
      return
    }

    if (e.key.length === 1) {
      if (now - lastKeyTime.current > maxInterval * 10) {
        buffer.current = ''
      }
      buffer.current += e.key
      lastKeyTime.current = now
    }
  }, [onScan, minLength, maxInterval])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
