import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

export function formatCurrency(amount: number | null | undefined): string {
  return currencyFormatter.format(amount ?? 0)
}

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(date: Date | string | null | undefined, options?: { includeTime?: boolean }): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (options?.includeTime) {
    return dateTimeFormatter.format(d).replace(/\u202f/g, ' ')
  }
  return dateFormatter.format(d).replace(/\u202f/g, ' ')
}

export function generateReceiptNumber(): number {
  // Genera un número único basado en timestamp (BIGINT)
  // Usamos el timestamp actual como base para garantizar unicidad
  return Date.now()
}

