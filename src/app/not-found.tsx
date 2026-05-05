import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">404 - Página no encontrada</h2>
      <p className="text-muted-foreground">La página que busca no existe.</p>
      <Link href="/" className="text-muni-blue underline">
        Volver al inicio
      </Link>
    </div>
  )
}
