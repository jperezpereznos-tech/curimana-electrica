/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de Turbopack (vacía para compatibilidad)
  turbopack: {},
  // Configuración de imágenes para Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Configuración de redirecciones
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ]
  },
}

// Serwist temporalmente deshabilitado - causa conflictos con Turbopack
// TODO: Migrar a configurator mode o usar --webpack flag
// Ver: https://github.com/serwist/serwist/issues/54
export default nextConfig
