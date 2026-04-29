/**
 * Utilidades para la generación de reportes descargables.
 */

export function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(obj => 
    Object.values(obj)
      .map(val => `"${val}"`) // Envolver en comillas para evitar errores con comas
      .join(',')
  )

  const csvContent = [headers, ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function formatCSVDate(date: string) {
  return new Date(date).toLocaleDateString('es-PE')
}
