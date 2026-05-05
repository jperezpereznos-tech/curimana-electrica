import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount ?? 0)
}

export function formatDate(date: Date | string | null | undefined, options?: { includeTime?: boolean }): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (options?.includeTime) {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function generateReceiptNumber(): number {
  // Genera un número único basado en timestamp (BIGINT)
  // Usamos el timestamp actual como base para garantizar unicidad
  return Date.now()
}

